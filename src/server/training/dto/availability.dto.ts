import { IsBoolean } from 'class-validator';

/** Body for every training "take this Dummy offline/online" control. */
export class SetAvailabilityDto {
  @IsBoolean()
  online!: boolean;
}
