import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PenhorService } from './penhor.service';
import { CreatePenhorDto, UpdatePenhorDto } from './dto/penhor.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Penhor')
@ApiBearerAuth()
@Controller('penhor')
@UseGuards(JwtAuthGuard)
export class PenhorController {
    constructor(private readonly penhorService: PenhorService) { }

    @Post()
    @ApiOperation({ summary: 'Registrar penhor com imagem' })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('imagemPenhor'))
    create(@Body() createPenhorDto: CreatePenhorDto, @UploadedFile() file: Express.Multer.File) {
        if (file) {
            createPenhorDto.imagemPenhor = file.buffer;
        }
        return this.penhorService.create(createPenhorDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todos os penhores' })
    findAll() {
        return this.penhorService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar penhor por ID' })
    findOne(@Param('id') id: string) {
        return this.penhorService.findOne(id);
    }

    @Get('cliente/:clienteId')
    @ApiOperation({ summary: 'Buscar penhores de um cliente' })
    findByCliente(@Param('clienteId') clienteId: string) {
        return this.penhorService.findByCliente(clienteId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Atualizar penhor' })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('imagemPenhor'))
    update(@Param('id') id: string, @Body() updatePenhorDto: UpdatePenhorDto, @UploadedFile() file: Express.Multer.File) {
        if (file) {
            updatePenhorDto.imagemPenhor = file.buffer;
        }
        return this.penhorService.update(id, updatePenhorDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Remover penhor' })
    remove(@Param('id') id: string) {
        return this.penhorService.remove(id);
    }
}
