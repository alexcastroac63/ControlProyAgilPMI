import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private available = true;

  async onModuleInit() {
    try {
      await this.$connect();
      this.available = true;
    } catch (error) {
      this.available = false;
      if (process.env.NODE_ENV !== "development") throw error;
      // En desarrollo la API sigue levantada para que la UI pueda trabajar con datos demo.
      console.warn("Prisma no pudo conectar con la base de datos. La API continua en modo desarrollo sin DB activa.");
    }
  }

  isAvailable() {
    return this.available;
  }

  markUnavailable() {
    this.available = false;
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
