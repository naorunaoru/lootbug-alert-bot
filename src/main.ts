import TelegramBot from "node-telegram-bot-api";
import mongoose from "mongoose";
import i18next from "i18next";
import dotenv from "dotenv";
import { Channel } from "./models";
import {
  getFormattedUsername,
  getFormattedUsernameFromMessage,
} from "./helpers";
import {
  addUserToChannel,
  findOrCreateChannel,
  findOrCreateUser,
  removeUserFromChannel,
} from "./db";

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const mongoUri = process.env.MONGODB_URI;

const MAX_USERS_PER_MESSAGE = 5;

const i18nResources = {
  en: {
    translation: {
      onList: "{{username}}, you're on a list now.",
      notOnList: "{{username}}, you're not on a list.",
      offList: "{{username}}, you are now of DELET from premises.",
      noRegisteredUsers:
        "There are no registered users in this channel. Use /register to get on the list.",
    },
  },
};

if (!token) {
  console.error(
    "Telegram bot token is not provided. Please set TELEGRAM_BOT_TOKEN in your environment variables."
  );
  process.exit(1);
}

if (!mongoUri) {
  console.error(
    "MongoDB connection URI is not provided. Please set MONGODB_URI in your environment variables."
  );
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(mongoUri);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }

  console.log("Successfully connected to MongoDB.");

  let bot: TelegramBot;

  try {
    bot = new TelegramBot(token, { polling: true });
  } catch (error) {
    console.error("Failed to create TelegramBot instance:", error);
    process.exit(1);
  }

  try {
    await i18next.init({
      lng: "en",
      resources: i18nResources,
      fallbackLng: "en",
    });
    console.log("i18next is initialized.");
  } catch (error) {
    console.error("Failed to initialize i18next:", error);
  }

  let botInfo;

  try {
    botInfo = await bot.getMe();
  } catch (error) {
    console.error("bot.getMe() encountered an error:", error);
    process.exit(1);
  }

  let botUsername = "";

  if (botInfo.username) {
    botUsername = `@${botInfo.username}`;
  }

  bot.onText(/\/register/, async (msg) => {
    const chatId = msg.chat.id.toString();
    if (!msg.from) return;

    const user = await findOrCreateUser(msg.from);
    const channel = await findOrCreateChannel(msg.chat);

    await addUserToChannel(user, channel);

    bot.sendMessage(
      chatId,
      i18next.t("onList", { username: getFormattedUsername(user) }),
      {
        parse_mode: "HTML",
      }
    );
  });

  bot.onText(/\/unregister/, async (msg) => {
    const chatId = msg.chat.id.toString();
    if (!msg.from) return;

    const user = await findOrCreateUser(msg.from);
    const channel = await findOrCreateChannel(msg.chat);

    const isUserInChannel = channel.users.some((u) => u._id.equals(user?._id));

    if (isUserInChannel) {
      await removeUserFromChannel(user, channel);

      bot.sendMessage(
        chatId,
        i18next.t("offList", {
          username: getFormattedUsernameFromMessage(msg),
        }),
        {
          parse_mode: "HTML",
        }
      );
    } else {
      bot.sendMessage(
        chatId,
        i18next.t("notOnList", {
          username: getFormattedUsernameFromMessage(msg),
        }),
        {
          parse_mode: "HTML",
        }
      );
    }
  });

  bot.onText(
    new RegExp(`/alert(?:${botUsername})?( .+)?`),
    async (msg, match) => {
      const chatId = msg.chat.id.toString();
      const message = match?.[1] || "";

      const channel = await Channel.findOne({ channelId: chatId }).populate(
        "users"
      );

      if (!channel || channel.users.length === 0) {
        bot.sendMessage(chatId, i18next.t("noRegisteredUsers"));
        return;
      }

      if (message) {
        await bot.sendMessage(chatId, message);
      }

      let index = 0;

      while (index < channel.users.length) {
        const usersBatch = channel.users.slice(
          index,
          index + MAX_USERS_PER_MESSAGE
        );
        const userMentions = usersBatch.map(getFormattedUsername).join(" ");

        await bot.sendMessage(chatId, `${userMentions}`, {
          parse_mode: "HTML",
        });

        index += MAX_USERS_PER_MESSAGE;
      }
    }
  );

  console.log("Bot commands registered.");
})();
