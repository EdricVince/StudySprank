import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LiveQuizRoomService, LmRoom } from './live-quiz.room.service';
import { LiveQuizService } from './live-quiz.service';
import type { LiveSession } from './entities/live-session.entity';
import { ROLE_TEACHER } from '../roles/entities/role.entity';
import { wsCorsOrigin } from '../../core/security/cors.setup';

/**
 * Real-time Live Lesson over Socket.IO (namespace `/live-quiz`).
 * The teacher hosts a session by PIN and leads it step by step (start / next /
 * prev / end); students join the same PIN and watch the current step in real
 * time. It's a meeting — no scoring, no timer, no answering.
 */
@WebSocketGateway({
  namespace: '/live-quiz',
  cors: { origin: wsCorsOrigin, credentials: true }, // same CORS_ORIGINS allow-list as REST
})
export class LiveQuizGateway implements OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private rooms: LiveQuizRoomService,
    private liveQuiz: LiveQuizService,
  ) {}

  private auth(socket: Socket) {
    return this.rooms.verifyToken(
      socket.handshake.auth?.token as string | undefined,
    );
  }

  /** Teacher hosts their own session (by PIN). */
  @SubscribeMessage('lm:host')
  async onHost(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { pin: string },
  ) {
    const user = this.auth(socket);
    if (!user || user.role_id !== ROLE_TEACHER) {
      socket.emit('lm:error', {
        message: 'Only a teacher can host a live lesson.',
      });
      return;
    }
    let session: LiveSession;
    try {
      session = await this.liveQuiz.findByPin(String(body?.pin ?? ''));
    } catch {
      socket.emit('lm:error', { message: 'Session not found.' });
      return;
    }
    if (session.teacher_id !== user.id) {
      socket.emit('lm:error', { message: 'This is not your session.' });
      return;
    }
    const steps = this.liveQuiz.parseSteps(session);
    const room = this.rooms.ensureRoom(
      session.pin,
      session.id,
      session.teacher_id,
      session.title,
      steps,
    );
    this.rooms.setHost(session.pin, socket.id);
    void socket.join(session.pin);
    socket.emit('lm:host_ready', {
      pin: session.pin,
      title: room.title,
      total: steps.length,
      status: room.status,
      currentIndex: room.currentIndex,
      participants: this.rooms.participantsList(room),
    });
  }

  /** Student joins a live lesson by PIN. */
  @SubscribeMessage('lm:join')
  async onJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { pin: string },
  ) {
    const user = this.auth(socket);
    if (!user) {
      socket.emit('lm:error', { message: 'Please sign in again.' });
      return;
    }
    let session: LiveSession;
    try {
      session = await this.liveQuiz.findByPin(String(body?.pin ?? ''));
    } catch {
      socket.emit('lm:error', {
        message: 'No live lesson found for that PIN.',
      });
      return;
    }
    const steps = this.liveQuiz.parseSteps(session);
    this.rooms.ensureRoom(
      session.pin,
      session.id,
      session.teacher_id,
      session.title,
      steps,
    );
    const name = (user.email?.split('@')[0] || 'Student').slice(0, 20);
    const room = this.rooms.addParticipant(
      session.pin,
      socket.id,
      user.id,
      name,
    );
    if (!room) {
      socket.emit('lm:error', { message: 'Could not join the session.' });
      return;
    }
    void socket.join(session.pin);
    socket.emit('lm:joined', {
      title: room.title,
      total: room.steps.length,
      status: room.status,
    });
    // Late joiner during a live lesson enters the meeting immediately (plus the
    // current step, if this session happens to use presentation steps).
    if (room.status === 'live') {
      socket.emit('lm:live', { title: room.title });
      // WebRTC: introduce this new peer to the host, and tell it who the host is.
      if (room.hostSocketId) {
        this.server
          .to(room.hostSocketId)
          .emit('rtc:peer', { id: socket.id, name });
        socket.emit('rtc:host', { id: room.hostSocketId });
      }
      const step = this.rooms.clientStep(room, room.currentIndex);
      if (step) socket.emit('lm:step', step);
    }
    this.notifyHostRoster(room);
    this.broadcastPresence(room);
  }

  @SubscribeMessage('lm:start')
  async onStart(@ConnectedSocket() socket: Socket) {
    const room = this.requireHost(socket);
    if (!room) return;
    const step = this.rooms.start(room.pin);
    await this.persistStatus(room, 'live');
    // Everyone enters the live meeting room. Presentation steps are optional —
    // only sessions that were built with steps also stream the current step.
    this.server.to(room.pin).emit('lm:live', { title: room.title });
    // WebRTC: hand the host every current peer, and tell everyone who the host is.
    if (room.hostSocketId) {
      this.server
        .to(room.hostSocketId)
        .emit('rtc:peers', { peers: this.rooms.participantSockets(room) });
      this.server.to(room.pin).emit('rtc:host', { id: room.hostSocketId });
    }
    if (step) this.server.to(room.pin).emit('lm:step', step);
  }

  /**
   * Relay a WebRTC signal (offer / answer / ICE candidate) to a specific peer socket —
   * only when sender and target are in the SAME live-lesson room.
   */
  @SubscribeMessage('rtc:signal')
  onRtcSignal(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { to: string; data: unknown },
  ) {
    if (!body?.to || !this.rooms.sameRoom(socket.id, String(body.to))) return;
    this.server
      .to(body.to)
      .emit('rtc:signal', { from: socket.id, data: body.data });
  }

  @SubscribeMessage('lm:next')
  async onNext(@ConnectedSocket() socket: Socket) {
    const room = this.requireHost(socket);
    if (!room) return;
    const res = this.rooms.next(room.pin);
    if (!res) return;
    if (res.ended) {
      await this.persistStatus(room, 'ended');
      this.server.to(room.pin).emit('lm:ended', {});
    } else if (res.step) {
      this.server.to(room.pin).emit('lm:step', res.step);
    }
  }

  @SubscribeMessage('lm:prev')
  onPrev(@ConnectedSocket() socket: Socket) {
    const room = this.requireHost(socket);
    if (!room) return;
    const step = this.rooms.prev(room.pin);
    if (step) this.server.to(room.pin).emit('lm:step', step);
  }

  @SubscribeMessage('lm:end')
  async onEnd(@ConnectedSocket() socket: Socket) {
    const room = this.requireHost(socket);
    if (!room) return;
    await this.persistStatus(room, 'ended');
    this.server.to(room.pin).emit('lm:ended', {});
  }

  handleDisconnect(socket: Socket) {
    const res = this.rooms.removeSocket(socket.id);
    if (!res) return;
    // Tell remaining peers to tear down the WebRTC connection to this socket.
    this.server.to(res.room.pin).emit('rtc:peer_left', { id: socket.id });
    if (res.wasHost) {
      this.server.to(res.room.pin).emit('lm:host_left', {});
    } else {
      this.notifyHostRoster(res.room);
      this.broadcastPresence(res.room);
    }
  }

  // ── helpers ────────────────────────────────────────────────────────────────
  private requireHost(socket: Socket): LmRoom | null {
    const room = this.rooms.getRoomBySocket(socket.id);
    if (!room || room.hostSocketId !== socket.id) {
      socket.emit('lm:error', {
        message: 'Only the host can control this lesson.',
      });
      return null;
    }
    return room;
  }

  private notifyHostRoster(room: LmRoom) {
    if (room.hostSocketId) {
      this.server.to(room.hostSocketId).emit('lm:participants', {
        participants: this.rooms.participantsList(room),
        count: room.participants.size,
      });
    }
  }

  private broadcastPresence(room: LmRoom) {
    this.server
      .to(room.pin)
      .emit('lm:presence', { count: room.participants.size });
  }

  private async persistStatus(room: LmRoom, status: string) {
    try {
      await this.liveQuiz.updateStatus(room.sessionId, room.teacherId, status);
    } catch {
      /* non-critical — the live room is authoritative */
    }
  }
}
