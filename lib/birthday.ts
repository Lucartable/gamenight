"use client";

// Temporary party switch: set to false after the birthday.
export const BIRTHDAY_MODE = false;
export const BIRTHDAY_NAME = "Hugo";

export const BIRTHDAY_EMOTE_COOLDOWN_MS = 8000;
export const BIRTHDAY_EMOTE_VISIBLE_MS = 1900;
export const BIRTHDAY_BROADCAST_EVENT = "birthday_emote";

export function getBirthdayMessage(name = BIRTHDAY_NAME): string {
  return `Joyeux anniversaire ${name} 🎉`;
}
