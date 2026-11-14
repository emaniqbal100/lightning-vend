import type { CreditInput, CreditResult, MachineName, MachineStatus, PingResult } from '@lightning-vend/shared';

export interface MachineAdapter {
  readonly name: MachineName;
  credit(input: CreditInput): Promise<CreditResult>;
  ping?(): Promise<PingResult>;
  status?(): Promise<MachineStatus>;
}
