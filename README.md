# 🤖 kiro-telegram-bot - Manage your coding sessions from Telegram

[![](https://img.shields.io/badge/Download-Kiro_Telegram_Bot-blue)](https://github.com/Ryoowa1303/kiro-telegram-bot)

This software links your Telegram account to your Kiro coding setup. It allows you to control coding projects, start sessions, and track progress from your mobile device. The bot functions as a bridge between your phone and your computer. It maintains a constant connection so your tools stay active even when you step away from your desk.

## ⚙️ System Requirements

Your computer needs to meet these basic standards to run the software.

*   Windows 10 or Windows 11.
*   An active Telegram account.
*   The Kiro CLI installed on your machine.
*   An internet connection to maintain the bridge between your computer and the Telegram servers.
*   At least 200 MB of free storage space for the background service.

You should have your Kiro CLI set up before you start this process. If you have not set up your coding environment, complete that task first.

## 📥 Download and Setup

Follow these instructions to get the application onto your system.

[Click here to visit the release page and download the software.](https://github.com/Ryoowa1303/kiro-telegram-bot)

1.  Navigate to the link provided above.
2.  Look for the section marked Releases on the right side of the page.
3.  Choose the version labeled for Windows.
4.  Download the compressed folder to your computer.
5.  Extract the files into a new folder on your desktop.
6.  Double-click the installer file to begin the setup process.
7.  Follow the prompts on your screen to complete the installation.

The installer creates a background service. This service runs quietly on your machine so the bot stays connected. You do not need to keep a terminal window open for the bot to work.

## 🔑 Initial Configuration

The bot needs permission to access your Telegram account. It uses the Agent Client Protocol to send commands.

1.  Open your Telegram app.
2.  Search for your bot username in the search bar.
3.  Press the Start button in the chat window.
4.  The bot will send you a verification code.
5.  Return to your computer and open the application settings.
6.  Enter the code you received into the provided text field.
7.  Save your settings to finalize the connection.

The bot is now ready to send commands to your coding environment. You can test the connection by sending the command /status to the bot. If the setup is correct, the bot will show your current workspace information.

## 🛠️ Bot Features

The bot handles many tasks to simplify your work.

### Manage Projects
You can switch between projects using the bot. Use the /projects command to see a list of your open items. Select the project you want to work on, and the bot will switch your Kiro CLI context.

### Resume Sessions
If you close your laptop, your sessions persist in the background. Use the /resume command to return to your work exactly where you left off. The bot attaches to the live session and provides a summary of the current status.

### Receive Updates
The bot streams responses back to your phone. It displays differences in code so you can track what changes occur. If the system processes a large task, it queues follow-up messages. You will receive notifications as the work completes.

### 24/7 Availability
The background service runs automatically when you start your computer. This creates a persistent link to your machine. You can check your code or run commands while away from your desk.

## 🖱️ Using the Bot

Operating the bot requires basic text commands. You provide these commands in the chat interface on Telegram.

*   /help: Shows a full list of available commands.
*   /attach: Connects your phone to an active coding session.
*   /detach: Safely stops tracking the current session.
*   /diff: Requests a summary of code changes in the active session.
*   /restart: Reboots the background service if you experience connectivity issues.

## 🛡️ Privacy and Security

The bot uses the Agent Client Protocol to translate your messages into actions. This process does not store your source code on any external server. The data travels between your Telegram app and your computer via an encrypted tunnel. 

Your desktop application acts as the host. All commands happen locally on your hardware. Only you have access to your bot. Do not share your Telegram account credentials with anyone else, as this gives them control over your local coding environment.

## 🔧 Troubleshooting

If you encounter issues, review these common fixes.

*   Connection Error: Check your internet connection. Ensure the background service is running by checking your System Tray icons.
*   Slow Responses: A slow internet connection might delay the stream. Wait a moment for the queued follow-up messages to arrive.
*   Commands Not Working: Verify your Kiro CLI is up to date. The bot relies on the latest version of the command-line interface to work correctly.
*   Bot Unresponsive: Use the /restart command in Telegram. This clears the network cache and reconnects to the local service.
*   Setup Failure: Ensure that your firewall allows the application to communicate with the network. You might need to add an exception for the service in your Windows Security settings.

If the problem persists, restart your computer. This forces the background service to refresh its temporary files and re-establish a stable link.