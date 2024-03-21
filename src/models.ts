import mongoose from "mongoose";

interface IUser {
  _id: mongoose.Types.ObjectId;
  telegramId: number;
  username: string;
  channels: mongoose.Types.ObjectId[];
}

interface IChannel {
  _id: mongoose.Types.ObjectId;
  channelId: string;
  users: IUser[];
}

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, unique: true, required: true },
  username: { type: String, unique: true, required: false },
  channels: [{ type: mongoose.Schema.Types.ObjectId, ref: "Channel" }],
});

const channelSchema = new mongoose.Schema({
  channelId: { type: String, unique: true, required: true },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

const User = mongoose.model<IUser>("User", userSchema);
const Channel = mongoose.model<IChannel>("Channel", channelSchema);

export { User, Channel };
