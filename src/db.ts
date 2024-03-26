import { HydratedDocument } from "mongoose";
import {
  Channel,
  AppChannel,
  AppUser,
  User,
  userMapper,
  channelMapper,
} from "./models";
import TelegramBot from "node-telegram-bot-api";

export async function findOrCreateUser(
  from: TelegramBot.User
): Promise<HydratedDocument<AppUser>> {
  let user = await User.findOneAndUpdate(
    { telegramId: from.id },
    { $set: userMapper(from) },
    { new: true, upsert: true }
  );

  return user;
}

export async function findOrCreateChannel(
  chat: TelegramBot.Chat
): Promise<HydratedDocument<AppChannel>> {
  let channel = await Channel.findOneAndUpdate(
    { channelId: chat.id },
    { $set: channelMapper(chat) },
    { new: true, upsert: true }
  );

  return channel;
}

export async function addUserToChannel(
  user: HydratedDocument<AppUser>,
  channel: HydratedDocument<AppChannel>
) {
  const isUserInChannel = channel.users.some((u) => u._id.equals(user?._id));

  if (!isUserInChannel) {
    channel.users.push(user);
    await channel.save();
  }

  const isChannelInUser = user.channels.some((c) => c.equals(channel?._id));

  if (!isChannelInUser) {
    user.channels.push(channel._id);
    await user.save();
  }
}

export async function removeUserFromChannel(
  user: HydratedDocument<AppUser>,
  channel: HydratedDocument<AppChannel>
) {
  user.channels = user.channels.filter(
    (ch) => ch.toString() !== channel._id.toString()
  );
  await user.save();

  channel.users = channel.users.filter(
    (usr) => usr.toString() !== user._id.toString()
  );
  await channel.save();
}
