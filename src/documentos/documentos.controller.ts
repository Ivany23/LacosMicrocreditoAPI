import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentosService } from './documentos.service';
import { CreateDocumentoDto, UpdateDocumentoDto } from './dto/documento.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Documentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documentos')
export class DocumentosController {
    constructor(private readonly documentosService: DocumentosService) { }

    @Post()
    @ApiOperation({ summary: 'Criar documento com upload de arquivo (PDF ou Imagem)' })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('arquivo'))
    create(
        @UploadedFile() file: Express.Multer.File,
        @Body() createDocumentoDto: CreateDocumentoDto
    ) {
        if (file) {
            createDocumentoDto.arquivo = file.buffer;
            (createDocumentoDto as any).mimetype = file.mimetype;
            (createDocumentoDto as any).nomeArquivo = file.originalname;
        }
        return this.documentosService.create(createDocumentoDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todos os documentos' })
    findAll() {
        return this.documentosService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar documento por ID' })
    findOne(@Param('id') id: string) {
        return this.documentosService.findOne(id);
    }

    @Get('cliente/:clienteId')
    @ApiOperation({ summary: 'Buscar documentos de um cliente' })
    findByCliente(@Param('clienteId') clienteId: string) {
        return this.documentosService.findByCliente(clienteId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Atualizar documento com upload opcional' })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('arquivo'))
    update(
        @Param('id') id: string,
        @UploadedFile() file: Express.Multer.File,
        @Body() updateDocumentoDto: UpdateDocumentoDto
    ) {
        if (file) {
            updateDocumentoDto.arquivo = file.buffer;
            (updateDocumentoDto as any).mimetype = file.mimetype;
            (updateDocumentoDto as any).nomeArquivo = file.originalname;
        }
        return this.documentosService.update(id, updateDocumentoDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Remover documento' })
    remove(@Param('id') id: string) {
        return this.documentosService.remove(id);
    }

    @Get(':id/arquivo')
    @ApiOperation({ summary: 'Visualizar/Download do arquivo' })
    async getArquivo(@Param('id') id: string, @Res() res: Response) {
        const doc = await this.documentosService.findOne(id);
        if (!doc || !doc.arquivo) throw new NotFoundException('Arquivo não encontrado');

        res.setHeader('Content-Type', doc.mimetype || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${doc.nomeArquivo || 'documento'}"`);
        res.send(doc.arquivo);
    }
}
