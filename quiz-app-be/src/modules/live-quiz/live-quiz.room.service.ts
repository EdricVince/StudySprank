import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyHs256 } from '../../core/security/jwt.util';
import { StepDto } from './live-quiz.service';

export interface LmParticipant {
  socketId: string;
  userId: number;
  name: string;
}

export interface LmRoom {
  pin: string;
  sessionId: number;
  teacherId: number;
  title: string;
  steps: StepDto[];
  hostSocketId: string | null;
  participants: Map<string, LmParticipant>;
  status: 'waiting' | 'live' | 'ended';
  currentIndex: number;
}

export interface ClientStep {
  index: number;
  total: number;
  title: string;
  body: string;
}

/**
 * In-memory state for every live lesson room (keyed by PIN). A live lesson is a
 * teacher-led meeting: the host advances through presentation steps and every
 * participant sees the current step in real time. There is no scoring, no timer
 * and no answering — students simply follow along.
 */
@Injectable()
export class LiveQuizRoomService {
  private rooms = new Map<string, LmRoom>();
  private socketPin = new Map<string, string>();

  constructor(private config: ConfigService) {}

  /** Verify the app's hand-rolled HMAC JWT presented on the WS handshake. */
  verifyToken(
    token?: string,
  ): { id: number; email: string; role_id: number } | null {
    const secret = this.config.get<string>('JWT_SECRET');
    if (!token || !secret) return null;
    const res = verifyHs256(token, secret); // constant-time signature check
    if (!res.ok) return null;
    return {
      id: res.payload.sub,
      email: res.payload.email,
      role_id: res.payload.role_id,
    };
  }

  getRoom(pin: string): LmRoom | undefined {
    return this.rooms.get(pin);
  }

  getRoomBySocket(socketId: string): LmRoom | undefined {
    const pin = this.socketPin.get(socketId);
    return pin ? this.rooms.get(pin) : undefined;
  }

  /** True only when both sockets (host or participant) belong to the same room. */
  sameRoom(socketA: string, socketB: string): boolean {
    if (socketA === socketB) return false;
    const pinA = this.socketPin.get(socketA);
    return !!pinA && pinA === this.socketPin.get(socketB);
  }

  /** Create the in-memory room from a DB session if it doesn't exist yet. */
  ensureRoom(
    pin: string,
    sessionId: number,
    teacherId: number,
    title: string,
    steps: StepDto[],
  ): LmRoom {
    let room = this.rooms.get(pin);
    if (!room) {
      room = {
        pin,
        sessionId,
        teacherId,
        title,
        steps,
        hostSocketId: null,
        participants: new Map(),
        status: 'waiting',
        currentIndex: 0,
      };
      this.rooms.set(pin, room);
    }
    return room;
  }

  setHost(pin: string, socketId: string): void {
    const room = this.rooms.get(pin);
    if (room) {
      room.hostSocketId = socketId;
      this.socketPin.set(socketId, pin);
    }
  }

  addParticipant(
    pin: string,
    socketId: string,
    userId: number,
    name: string,
  ): LmRoom | null {
    const room = this.rooms.get(pin);
    if (!room) return null;
    if (!room.participants.has(socketId)) {
      room.participants.set(socketId, { socketId, userId, name });
    }
    this.socketPin.set(socketId, pin);
    return room;
  }

  /** Participant roster (names only — no scores in a meeting). */
  participantsList(room: LmRoom): { name: string }[] {
    return [...room.participants.values()].map((p) => ({ name: p.name }));
  }

  /** Participant socket ids + names — the host needs these to open a WebRTC peer to each. */
  participantSockets(room: LmRoom): { id: string; name: string }[] {
    return [...room.participants.values()].map((p) => ({
      id: p.socketId,
      name: p.name,
    }));
  }

  clientStep(room: LmRoom, index: number): ClientStep | null {
    const s = room.steps[index];
    if (!s) return null;
    return {
      index,
      total: room.steps.length,
      title: s.title,
      body: s.body,
    };
  }

  /** Begin the lesson at step 0. */
  start(pin: string): ClientStep | null {
    const room = this.rooms.get(pin);
    if (!room) return null;
    room.status = 'live';
    room.currentIndex = 0;
    return this.clientStep(room, 0);
  }

  /** Advance to the next step, or end. Returns ended=true when past the last step. */
  next(pin: string): { ended: boolean; step: ClientStep | null } | null {
    const room = this.rooms.get(pin);
    if (!room) return null;
    if (room.currentIndex < room.steps.length - 1) {
      room.currentIndex++;
      return { ended: false, step: this.clientStep(room, room.currentIndex) };
    }
    room.status = 'ended';
    return { ended: true, step: null };
  }

  /** Go back to the previous step (no-op at the first step). */
  prev(pin: string): ClientStep | null {
    const room = this.rooms.get(pin);
    if (!room) return null;
    if (room.currentIndex > 0) room.currentIndex--;
    return this.clientStep(room, room.currentIndex);
  }

  /** Remove a socket (leave/disconnect). Reports whether it was the host. */
  removeSocket(socketId: string): { room: LmRoom; wasHost: boolean } | null {
    const pin = this.socketPin.get(socketId);
    this.socketPin.delete(socketId);
    if (!pin) return null;
    const room = this.rooms.get(pin);
    if (!room) return null;
    const wasHost = room.hostSocketId === socketId;
    if (wasHost) room.hostSocketId = null;
    room.participants.delete(socketId);
    if (!room.hostSocketId && room.participants.size === 0) {
      this.rooms.delete(pin); // nobody left — drop the room
    }
    return { room, wasHost };
  }
}
