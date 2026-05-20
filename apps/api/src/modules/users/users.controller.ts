import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UserRequestDto } from "../../common/swagger/api-docs.dto";
import { UsersService } from "./users.service";

@ApiTags("users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly service: UsersService) {}
  @ApiOperation({ summary: "Listar usuarios de la organizacion" })
  @Get() list(@CurrentUser() user: any) { return this.service.list(user.organizationId); }
  @ApiOperation({ summary: "Crear usuario" })
  @Post() create(@CurrentUser() user: any, @Body() body: UserRequestDto) { return this.service.create(user.organizationId, body); }
  @ApiOperation({ summary: "Actualizar usuario, rol o estado" })
  @ApiBody({ type: UserRequestDto })
  @Patch(":id") update(@Param("id") id: string, @Body() body: Partial<UserRequestDto>) { return this.service.update(id, body); }
}
