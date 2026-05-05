import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsersService } from "./users.service";

@ApiTags("users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly service: UsersService) {}
  @Get() list(@CurrentUser() user: any) { return this.service.list(user.organizationId); }
  @Post() create(@CurrentUser() user: any, @Body() body: any) { return this.service.create(user.organizationId, body); }
  @Patch(":id") update(@Param("id") id: string, @Body() body: any) { return this.service.update(id, body); }
}
