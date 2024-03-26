import mongoose from "mongoose";
import TelegramBot from "node-telegram-bot-api";

export type User = {
  telegramId: number;
  username?: string;
  firstName: string;
  lastName?: string;
};

export type AppUser = User & {
  _id: mongoose.Types.ObjectId;
  channels: mongoose.Types.ObjectId[];
};

export type Channel = {
  channelId: string;
};

export type AppChannel = Channel & {
  _id: mongoose.Types.ObjectId;
  users: AppUser[];
};

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, unique: true, required: true },
  username: { type: String, unique: true, required: false },
  firstName: { type: String, unique: false, required: false },
  lastName: { type: String, unique: false, required: false },
  channels: [{ type: mongoose.Schema.Types.ObjectId, ref: "Channel" }],
});

const channelSchema = new mongoose.Schema({
  channelId: { type: String, unique: true, required: true },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

const User = mongoose.model<AppUser>("User", userSchema);
const Channel = mongoose.model<AppChannel>("Channel", channelSchema);

export const userMapper = (from?: TelegramBot.User): User | undefined => {
  if (!from) {
    return undefined;
  }

  return {
    telegramId: from.id,
    username: from.username,
    firstName: from.first_name,
    lastName: from.last_name,
  };
};

export const channelMapper = (chat: TelegramBot.Chat): Channel | undefined => {
  return { channelId: chat.id.toString() };
};

export { User, Channel };
