import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  BadRequestException,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtGuard } from '../../core/guards/jwt.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { ROLE_TEACHER } from '../roles/entities/role.entity';
import {
  AiService,
  WordOfTheDay,
  ImportedContent,
  VocabularyItem,
  GeneratedLesson,
  GeneratedVocabSet,
  GeneratedTest,
} from './ai.service';
import {
  IsOptional,
  IsString,
  IsInt,
  IsArray,
  Min,
  Max,
} from 'class-validator';

class ScanContentDto {
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() text?: string;
  @IsOptional() @IsString() language?: string;
}

class GenerateVocabDto {
  @IsString() learningLang!: string;
  @IsString() uiLang!: string;
  @IsOptional() @IsInt() @Min(1) @Max(30) count?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) exclude?: string[];
}

class GenerateLessonDto {
  @IsString() skill!: string;
  @IsString() level!: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() meaningLanguage?: string;
  @IsOptional() @IsString() topic?: string;
}

class GenerateVocabSetDto {
  @IsString() topic!: string;
  @IsString() level!: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() meaningLanguage?: string;
  @IsOptional() @IsInt() @Min(4) @Max(40) count?: number;
}

class GenerateTestDto {
  @IsString() topic!: string;
  @IsString() level!: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsInt() @Min(1) @Max(20) count?: number;
}

// word-of-the-day + vocabulary: any signed-in user; content-authoring endpoints: teachers only.
@Controller('api/v1/ai')
@UseGuards(JwtGuard, RolesGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('word-of-the-day')
  async getWordOfTheDay(
    @Query('fresh') fresh?: string,
  ): Promise<{ code: number; message: string; data: WordOfTheDay }> {
    const data = await this.aiService.getWordOfTheDay(
      fresh === '1' || fresh === 'true',
    );
    return { code: 200, message: 'Word of the day', data };
  }

  @Post('vocabulary')
  async generateVocabulary(
    @Body() dto: GenerateVocabDto,
  ): Promise<{ code: number; message: string; data: VocabularyItem[] }> {
    const data = await this.aiService.generateVocabulary(dto);
    return { code: 200, message: 'Vocabulary generated', data };
  }

  @Post('lesson')
  @Roles(ROLE_TEACHER)
  async generateLesson(
    @Body() dto: GenerateLessonDto,
  ): Promise<{ code: number; message: string; data: GeneratedLesson }> {
    const data = await this.aiService.generateLesson(dto);
    return { code: 200, message: 'Lesson generated', data };
  }

  @Post('vocab-set')
  @Roles(ROLE_TEACHER)
  async generateVocabSet(
    @Body() dto: GenerateVocabSetDto,
  ): Promise<{ code: number; message: string; data: GeneratedVocabSet }> {
    const data = await this.aiService.generateVocabularySet(dto);
    return { code: 200, message: 'Vocabulary set generated', data };
  }

  @Post('test')
  @Roles(ROLE_TEACHER)
  async generateTest(
    @Body() dto: GenerateTestDto,
  ): Promise<{ code: number; message: string; data: GeneratedTest }> {
    const data = await this.aiService.generateTest(dto);
    return { code: 200, message: 'Test generated', data };
  }

  @Post('import/scan')
  @Roles(ROLE_TEACHER)
  async scanContent(
    @Body() dto: ScanContentDto,
  ): Promise<{ code: number; data: ImportedContent }> {
    if (!dto.url && !dto.text) {
      throw new BadRequestException('Provide either a URL or text content.');
    }
    try {
      const data = await this.aiService.scanContent(dto);
      return { code: 200, data };
    } catch (err: unknown) {
      // Keep the service's status (400 bad input / 503 AI down); only unknown errors become 500.
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to scan content');
    }
  }
}
