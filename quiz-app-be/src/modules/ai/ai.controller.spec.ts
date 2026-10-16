import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AiController } from './ai.controller';
import { RolesGuard } from '../../core/guards/roles.guard';
import { JwtGuard } from '../../core/guards/jwt.guard';
import { ROLES_KEY } from '../../core/decorators/roles.decorator';
import { ROLE_TEACHER } from '../roles/entities/role.entity';

describe('AiController — RBAC on content-authoring endpoints', () => {
  const reflector = new Reflector();
  const rolesOf = (method: keyof AiController) =>
    reflector.get<number[]>(ROLES_KEY, AiController.prototype[method]);

  it('runs JwtGuard then RolesGuard on the controller', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AiController)).toEqual([
      JwtGuard,
      RolesGuard,
    ]);
  });

  it.each([
    'generateLesson',
    'generateVocabSet',
    'generateTest',
    'scanContent',
  ] as const)('%s is teacher-only', (method) => {
    expect(rolesOf(method)).toEqual([ROLE_TEACHER]);
  });

  it('keeps word-of-the-day and student vocabulary practice open to every signed-in user', () => {
    expect(rolesOf('getWordOfTheDay')).toBeUndefined();
    expect(rolesOf('generateVocabulary')).toBeUndefined();
  });
});
