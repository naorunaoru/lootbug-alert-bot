import TelegramBot from "node-telegram-bot-api";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Channel, User } from "./models";

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const mongoUri = process.env.MONGODB_URI;

if (!token) {
  console.error(
    "Telegram bot token is not provided. Please set TELEGRAM_BOT_TOKEN in your environment variables."
  );
  process.exit(1);
}

let bot: TelegramBot;

try {
  bot = new TelegramBot(token, { polling: true });
} catch (error) {
  console.error("Failed to create TelegramBot instance:", error);
  process.exit(1);
}

if (!mongoUri) {
  console.error(
    "MongoDB connection URI is not provided. Please set MONGODB_URI in your environment variables."
  );
  process.exit(1); // Exit the process if the URI is not available
}

mongoose
  .connect(mongoUri)
  .then(() => console.log("Successfully connected to MongoDB."))
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1); // Exit the process if there's an error connecting to MongoDB
  });

bot.onText(/\/register/, async (msg) => {
  const chatId = msg.chat.id.toString();
  const userId = msg.from?.id;
  const name = msg.from?.username;

  if (!userId) return;

  let user = await User.findOne({ telegramId: userId });

  if (!user) {
    user = new User({ telegramId: userId, username: name, channels: [] });
    await user.save();
  } else {
    if (name && user.username !== name) {
      user.username = name;
      await user.save();
    }
  }

  let channel = await Channel.findOne({ channelId: chatId });
  if (!channel) {
    channel = new Channel({ channelId: chatId, users: [] });
    await channel.save();
  }

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

  bot.sendMessage(chatId, `${name}, you're on a list now.`);
});

bot.onText(/\/unregister/, async (msg) => {
  const chatId = msg.chat.id.toString();
  const userId = msg.from?.id;
  if (!userId) return;

  const user = await User.findOne({ telegramId: userId });
  const channel = await Channel.findOne({ channelId: chatId });

  if (user && channel) {
    user.channels = user.channels.filter(
      (ch) => ch.toString() !== channel._id.toString()
    );
    await user.save();

    channel.users = channel.users.filter(
      (usr) => usr.toString() !== user._id.toString()
    );
    await channel.save();

    bot.sendMessage(chatId, `${user?.username}, you are now of DELET.`);
  } else {
    bot.sendMessage(chatId, `${user?.username}, you haven't registered yet.`);
  }
});

bot.onText(/\/call( .+)?/, async (msg, match) => {
  const chatId = msg.chat.id.toString();
  const message = match?.[1] || "";

  const channel = await Channel.findOne({ channelId: chatId }).populate(
    "users"
  );

  if (!channel || channel.users.length === 0) {
    bot.sendMessage(
      chatId,
      "There are no registered users in this channel. Use /register to get on the list."
    );
    return;
  }

  const userMentions = channel.users
    .map((user) => `@${user.username}`)
    .join(" ");

  bot.sendMessage(chatId, `${userMentions} ${message.trim()}`);
});
