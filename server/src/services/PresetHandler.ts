import { z } from "zod";
import { HouseRules, RulesPreset } from "../types/index.js";
import { RoomError } from "./RoomManager.js";

export const HOUSE_RULES_PRESETS: Record<
  Exclude<RulesPreset, "CUSTOM">,
  Omit<HouseRules, "preset">
> = {
  QUICK: {
    roundLengthMinutes: 5,
    headStartSeconds: 15,
    pingIntervalSeconds: 30,
    playZoneEnabled: true,
    zoneSizeMeters: 200,
    zoneShrinks: false,
    zoneShrinkIntervalMinutes: 5,
    huntersCanTalk: true,
  },
  STANDARD: {
    roundLengthMinutes: 10,
    headStartSeconds: 30,
    pingIntervalSeconds: 60,
    playZoneEnabled: true,
    zoneSizeMeters: 500,
    zoneShrinks: false,
    zoneShrinkIntervalMinutes: 5,
    huntersCanTalk: true,
  },
  BIG_PARK: {
    roundLengthMinutes: 20,
    headStartSeconds: 60,
    pingIntervalSeconds: 90,
    playZoneEnabled: true,
    zoneSizeMeters: 1000,
    zoneShrinks: true,
    zoneShrinkIntervalMinutes: 5,
    huntersCanTalk: true,
  },
};

export const presetValidationSchema = z.object({
  preset: z.enum(["QUICK", "STANDARD", "BIG_PARK", "CUSTOM"]),
  roundLengthMinutes: z.number().int().min(3).max(60).optional(),
  headStartSeconds: z.number().int().min(10).max(120).optional(),
  pingIntervalSeconds: z.number().int().min(15).max(180).optional(),
  playZoneEnabled: z.boolean().optional(),
  zoneSizeMeters: z.number().positive().min(100).max(5000).optional(),
  zoneShrinks: z.boolean().optional(),
  zoneShrinkIntervalMinutes: z.number().int().min(1).max(15).optional(),
  huntersCanTalk: z.boolean().optional(),
});

export class PresetHandler {
  /**
   * Validates and applies house rules based on selected preset and optional custom overrides.
   */
  public static validateAndApply(
    currentRules: HouseRules,
    rawUpdate: unknown
  ): HouseRules {
    const parseResult = presetValidationSchema.safeParse(rawUpdate);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      throw new RoomError(
        "INVALID_PRESET",
        `Invalid rule configuration: ${issue?.path.join(".")} - ${issue?.message}`
      );
    }

    const update = parseResult.data;

    // 1. If selecting a standard preset without custom overrides
    if (update.preset !== "CUSTOM") {
      const presetDefaults = HOUSE_RULES_PRESETS[update.preset];
      return {
        preset: update.preset,
        ...presetDefaults,
        // Allow selective override if explicitly provided while maintaining preset key
        ...(update.roundLengthMinutes !== undefined && { roundLengthMinutes: update.roundLengthMinutes }),
        ...(update.headStartSeconds !== undefined && { headStartSeconds: update.headStartSeconds }),
        ...(update.pingIntervalSeconds !== undefined && { pingIntervalSeconds: update.pingIntervalSeconds }),
        ...(update.playZoneEnabled !== undefined && { playZoneEnabled: update.playZoneEnabled }),
        ...(update.zoneSizeMeters !== undefined && { zoneSizeMeters: update.zoneSizeMeters }),
        ...(update.zoneShrinks !== undefined && { zoneShrinks: update.zoneShrinks }),
        ...(update.zoneShrinkIntervalMinutes !== undefined && { zoneShrinkIntervalMinutes: update.zoneShrinkIntervalMinutes }),
        ...(update.huntersCanTalk !== undefined && { huntersCanTalk: update.huntersCanTalk }),
      };
    }

    // 2. Custom Rules mode
    return {
      preset: "CUSTOM",
      roundLengthMinutes: update.roundLengthMinutes ?? currentRules.roundLengthMinutes ?? 10,
      headStartSeconds: update.headStartSeconds ?? currentRules.headStartSeconds ?? 30,
      pingIntervalSeconds: update.pingIntervalSeconds ?? currentRules.pingIntervalSeconds ?? 60,
      playZoneEnabled: update.playZoneEnabled ?? currentRules.playZoneEnabled ?? true,
      zoneSizeMeters: update.zoneSizeMeters ?? currentRules.zoneSizeMeters ?? 500,
      zoneShrinks: update.zoneShrinks ?? currentRules.zoneShrinks ?? false,
      zoneShrinkIntervalMinutes: update.zoneShrinkIntervalMinutes ?? currentRules.zoneShrinkIntervalMinutes ?? 5,
      huntersCanTalk: update.huntersCanTalk ?? currentRules.huntersCanTalk ?? true,
    };
  }

  /**
   * Retrieves preset defaults by name.
   */
  public static getPresetDefaults(preset: Exclude<RulesPreset, "CUSTOM">): Omit<HouseRules, "preset"> {
    return { ...HOUSE_RULES_PRESETS[preset] };
  }
}
