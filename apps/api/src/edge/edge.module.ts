import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { EDGE_ADAPTER } from "./edge-adapter";
import { StubEdgeAdapter } from "./stub-edge.adapter";

@Module({
  imports: [PrismaModule],
  providers: [
    StubEdgeAdapter,
    {
      provide: EDGE_ADAPTER,
      useExisting: StubEdgeAdapter,
    },
  ],
  exports: [EDGE_ADAPTER, StubEdgeAdapter],
})
export class EdgeModule {}
