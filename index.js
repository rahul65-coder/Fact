// filmfanatic-bot/index.js
const BOT_TOKEN = "8192872982:AAEg-FFpyGXWgrIqEIFcCgNYeNq389rGU90";
const ADMIN_ID = 8314195743;
const ADMIN_NAME = "Sk Sahil";
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

const CATEGORIES = [
    "Action", "Comedy", "Drama", "Thriller", "Romance",
    "Horror", "Sci-Fi", "Adventure", "Animation", "Crime",
    "Fantasy", "Mystery", "Documentary", "Musical", "War"
];

// ===================== KV STORAGE UTILITIES =====================
async function loadUsers(env) {
    try {
        const data = await env.USERS_KV.get("users");
        return data ? JSON.parse(data) : {};
    } catch (e) {
        console.error("Error loading users:", e);
        return {};
    }
}

async function saveUsers(env, users) {
    try {
        await env.USERS_KV.put("users", JSON.stringify(users));
        return true;
    } catch (e) {
        console.error("Error saving users:", e);
        return false;
    }
}

async function loadMovies(env) {
    try {
        const data = await env.MOVIES_KV.get("movies");
        return data ? JSON.parse(data) : {};
    } catch (e) {
        console.error("Error loading movies:", e);
        return {};
    }
}

async function saveMovies(env, movies) {
    try {
        await env.MOVIES_KV.put("movies", JSON.stringify(movies));
        return true;
    } catch (e) {
        console.error("Error saving movies:", e);
        return false;
    }
}

async function loadRequests(env) {
    try {
        const data = await env.REQUESTS_KV.get("requests");
        return data ? JSON.parse(data) : {};
    } catch (e) {
        console.error("Error loading requests:", e);
        return {};
    }
}

async function saveRequests(env, requests) {
    try {
        await env.REQUESTS_KV.put("requests", JSON.stringify(requests));
        return true;
    } catch (e) {
        console.error("Error saving requests:", e);
        return false;
    }
}

async function loadCategories(env) {
    try {
        const data = await env.CATEGORIES_KV.get("categories");
        return data ? JSON.parse(data) : {};
    } catch (e) {
        console.error("Error loading categories:", e);
        return {};
    }
}

async function saveCategories(env, categories) {
    try {
        await env.CATEGORIES_KV.put("categories", JSON.stringify(categories));
        return true;
    } catch (e) {
        console.error("Error saving categories:", e);
        return false;
    }
}

// ===================== TELEGRAM API FUNCTIONS =====================
async function sendMessage(chatId, text, parseMode = "HTML", replyMarkup = null) {
    const maxRetries = 3;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const data = {
                chat_id: chatId,
                text: text,
                parse_mode: parseMode
            };
            
            if (replyMarkup) {
                data.reply_markup = JSON.stringify(replyMarkup);
            }
            
            const response = await fetch(`${API_URL}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                return true;
            }
            
            console.log(`Attempt ${attempt + 1}/${maxRetries} failed for chat ${chatId}`);
            
            if (attempt < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (e) {
            console.error(`Error sending message:`, e);
            if (attempt < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }
    
    return false;
}

async function sendDocument(chatId, fileId, caption = "", parseMode = "HTML") {
    try {
        const data = {
            chat_id: chatId,
            document: fileId,
            caption: caption,
            parse_mode: parseMode
        };
        
        const response = await fetch(`${API_URL}/sendDocument`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        return response.ok;
    } catch (e) {
        console.error(`Error sending document to ${chatId}:`, e);
        return false;
    }
}

function isAdmin(userId) {
    return String(userId) === String(ADMIN_ID);
}

// ===================== USER MANAGEMENT =====================
async function createUser(env, userId, userName, referrerId = null) {
    const users = await loadUsers(env);
    const userIdStr = String(userId);
    
    if (!users[userIdStr]) {
        users[userIdStr] = {
            name: userName,
            referred_by: referrerId,
            referrals: [],
            joined_date: new Date().toISOString(),
            movies_requested: [],
            downloaded: [],
            referral_completed: false,
            categories_selected: false,
            categories: [],
            total_referrals_needed: 1,
            referrals_done: 0
        };
        
        await saveUsers(env, users);
        
        // Log user registration
        const regDate = new Date().toLocaleString('en-IN', { 
            timeZone: 'Asia/Kolkata',
            dateStyle: 'medium',
            timeStyle: 'medium'
        });
        
        console.log(`✅ New user registered: ${userName} (ID: ${userId}) on ${regDate}`);
    }
    
    return users[userIdStr];
}

async function canUserAccess(env, userId) {
    if (isAdmin(userId)) return true;
    
    const users = await loadUsers(env);
    const userIdStr = String(userId);
    
    if (!users[userIdStr]) return false;
    
    const user = users[userIdStr];
    return user.referrals_done >= user.total_referrals_needed;
}

async function resetUserCategories(env, userId) {
    const users = await loadUsers(env);
    const userIdStr = String(userId);
    
    if (users[userIdStr]) {
        users[userIdStr].categories = [];
        users[userIdStr].categories_selected = false;
        await saveUsers(env, users);
        return true;
    }
    
    return false;
}

// ===================== COMMAND HANDLERS =====================
async function handleStart(env, message) {
    const userId = String(message.from.id);
    const userName = message.from.first_name || "User";
    const chatId = message.chat.id;
    const text = message.text || "";
    
    // Get greeting based on time (IST)
    const now = new Date();
    const currentHour = now.getUTCHours() + 5.5; // Convert to IST
    
    let greeting = "𝐺𝑜𝑜𝑑 𝐸𝑣𝑒𝑛𝑖𝑛𝑔";
    if (currentHour < 12) greeting = "𝐺𝑜𝑜𝑑 𝑀𝑜𝑟𝑛𝑖𝑛𝑔";
    else if (currentHour < 17) greeting = "𝐺𝑜𝑜𝑑 𝐴𝑓𝑡𝑒𝑟𝑛𝑜𝑜𝑛";
    
    let referredStatus = "";
    
    // Check if user was referred
    if (text.includes("/start ref_")) {
        try {
            const referrerId = text.split("ref_")[1].split(" ")[0];
            const users = await loadUsers(env);
            
            if (!users[userId]) {
                await createUser(env, userId, userName, referrerId);
                
                if (users[referrerId]) {
                    users[referrerId].referrals_done = (users[referrerId].referrals_done || 0) + 1;
                    users[referrerId].referrals.push(userId);
                    
                    if (users[referrerId].referrals_done >= (users[referrerId].total_referrals_needed || 1)) {
                        users[referrerId].referral_completed = true;
                    }
                    
                    await saveUsers(env, users);
                    
                    await sendMessage(
                        parseInt(referrerId),
                        `✅ <b>Referral Verified!</b>\n\n👤 <b>${userName}</b> joined from your link\n\n👥 <b>Referrals Completed:</b> ${users[referrerId].referrals_done}/1\n\n🎬 <b>You can now access movies!</b>`
                    );
                    
                    referredStatus = "\n\n✅ Welcome! You were referred!";
                    
                    console.log(`📊 Referral: ${userName} referred by ${referrerId}`);
                }
            }
        } catch (e) {
            console.error("Error processing referral:", e);
        }
    } else {
        await createUser(env, userId, userName);
    }
    
    const welcome = `ʜᴇʏ ${userName}, ${greeting}

ɪ ᴀᴍ ᴀ ᴘᴏᴡᴇʀꜰᴜʟ ᴀᴜᴛᴏꜰɪʟᴛᴇʀ ʙᴏᴛ. ʏᴏᴜ ᴄᴀɴ ᴜsᴇ ᴍᴇ ɪɴ ʏᴏᴜʀ ɢʀᴏᴜᴘ ɪ ᴡɪʟʟ ɢɪᴠᴇ ᴍᴏᴠɪᴇs ᴏʀ sᴇʀɪᴇs ɪɴ ʏᴏᴜʀ ɢʀᴏᴜᴘ ᴀɴᴅ ᴘᴍ !! 😍
🌿 ᴍᴀɪɴᴛᴀɪɴᴇᴅ ʙʏ : @FilmFanaticZone_bot

━━━━━━━━━━━━━━━━━━━━━━━━━
<b>📋 USER COMMANDS:</b>
━━━━━━━━━━━━━━━━━━━━━━━━━
/start - Start bot
/referer - Get referral link
/info - Select categories & get movies
/resetcat - Reset your categories
/request - Check your requests
/myinfo - Your profile
/help - Show help

<b>🎬 IMPORTANT:</b>
1. Complete 1 referral to access movies
2. Use /info to select your favorite categories
3. Then search for movies!${referredStatus}`;
    
    await sendMessage(chatId, welcome);
}

async function handleReferer(env, message) {
    const userId = String(message.from.id);
    const chatId = message.chat.id;
    const users = await loadUsers(env);
    
    if (users[userId]) {
        const user = users[userId];
        const referralLink = `https://t.me/FilmFanaticZone_bot?start=ref_${userId}`;
        const referralsDone = user.referrals_done || 0;
        const totalNeeded = user.total_referrals_needed || 1;
        
        const text = `🔗 <b>Your Referral Link:</b>
<code>${referralLink}</code>

👥 <b>Referrals Completed:</b> ${referralsDone}/${totalNeeded}

<b>📢 Share this in groups:</b>
<code>🎬 Get Movies & Series Here! @FilmFanaticZone_bot</code>

${user.referral_completed ? "" : "⚠️ <b>Complete 1 referral to access movies!</b>"}`;
        
        await sendMessage(chatId, text);
    }
}

async function showCategoryKeyboard(env, chatId, userId) {
    const users = await loadUsers(env);
    const userIdStr = String(userId);
    
    if (!users[userIdStr]) return;
    
    const user = users[userIdStr];
    const selectedCategories = user.categories || [];
    
    const keyboard = [];
    let row = [];
    
    CATEGORIES.forEach((category, i) => {
        const prefix = selectedCategories.includes(category) ? "✅ " : "";
        row.push({ text: `${prefix}${category}` });
        
        if ((i + 1) % 2 === 0) {
            keyboard.push(row);
            row = [];
        }
    });
    
    if (row.length > 0) {
        keyboard.push(row);
    }
    
    keyboard.push([
        { text: "📋 View Selected" },
        { text: "🔄 Reset Categories" }
    ]);
    keyboard.push([{ text: "✅ Done Selecting" }]);
    
    const replyMarkup = {
        keyboard: keyboard,
        resize_keyboard: true,
        one_time_keyboard: false
    };
    
    const selectedCount = selectedCategories.length;
    const statusText = selectedCount > 0 ? ` (${selectedCount}/2 selected)` : "";
    
    await sendMessage(
        chatId,
        `📋 <b>Select your favorite categories (minimum 2)${statusText}:</b>\n\n` +
        `• Click categories to select/deselect\n` +
        `• 📋 View Selected - See your current selection\n` +
        `• 🔄 Reset Categories - Clear all selections\n` +
        `• ✅ Done Selecting - Finish when you have 2+ categories`,
        "HTML",
        replyMarkup
    );
}

async function handleInfo(env, message) {
    const userId = String(message.from.id);
    const chatId = message.chat.id;
    const users = await loadUsers(env);
    
    if (!users[userId]) {
        await sendMessage(chatId, "❌ Please use /start first!");
        return;
    }
    
    const canAccess = await canUserAccess(env, parseInt(userId));
    if (!canAccess) {
        await sendMessage(
            chatId,
            "❌ <b>Complete referral first!</b>\n\nUse /referer to get your referral link\nComplete 1 referral to access movies!"
        );
        return;
    }
    
    const user = users[userId];
    
    if (!user.categories_selected) {
        await showCategoryKeyboard(env, chatId, userId);
    } else {
        await showCategoryMovies(env, chatId, userId);
    }
}

async function handleResetCat(env, message) {
    const userId = String(message.from.id);
    const chatId = message.chat.id;
    
    if (await resetUserCategories(env, userId)) {
        await sendMessage(
            chatId,
            "🔄 <b>Categories reset successfully!</b>\n\n" +
            "Use /info to select new categories."
        );
    } else {
        await sendMessage(chatId, "❌ User not found!");
    }
}

async function handleCategorySelection(env, message, category) {
    const userId = String(message.from.id);
    const chatId = message.chat.id;
    const users = await loadUsers(env);
    
    if (!users[userId]) return;
    
    const user = users[userId];
    
    if (!user.categories) {
        user.categories = [];
    }
    
    const selectedCategories = user.categories;
    
    if (selectedCategories.includes(category)) {
        const index = selectedCategories.indexOf(category);
        selectedCategories.splice(index, 1);
    } else {
        selectedCategories.push(category);
    }
    
    await saveUsers(env, users);
    await showCategoryKeyboard(env, chatId, userId);
}

async function handleViewSelected(env, message) {
    const userId = String(message.from.id);
    const chatId = message.chat.id;
    const users = await loadUsers(env);
    
    if (!users[userId]) return;
    
    const user = users[userId];
    const selectedCategories = user.categories || [];
    
    let text;
    if (selectedCategories.length === 0) {
        text = "📭 <b>No categories selected yet!</b>";
    } else {
        text = `📋 <b>Your Selected Categories (${selectedCategories.length}/2):</b>\n\n`;
        selectedCategories.forEach(cat => {
            text += `• ✅ ${cat}\n`;
        });
    }
    
    await sendMessage(chatId, text);
}

async function handleDoneSelecting(env, message) {
    const userId = String(message.from.id);
    const chatId = message.chat.id;
    const users = await loadUsers(env);
    
    if (!users[userId]) return;
    
    const user = users[userId];
    const selectedCategories = user.categories || [];
    
    if (selectedCategories.length < 2) {
        await sendMessage(
            chatId,
            `❌ <b>Please select at least 2 categories!</b>\n\n` +
            `Currently selected: ${selectedCategories.length}/2`
        );
        return;
    }
    
    user.categories_selected = true;
    await saveUsers(env, users);
    
    const replyMarkup = { remove_keyboard: true };
    
    await sendMessage(
        chatId,
        `✅ <b>Categories Saved!</b>\n\n` +
        `<b>Your categories (${selectedCategories.length}):</b>\n` +
        selectedCategories.map(cat => `• ${cat}`).join("\n") +
        `\n\n🎬 <b>Now you can:</b>\n` +
        `1. Type movie name to search\n` +
        `2. Use /info to browse movies\n` +
        `3. Use /resetcat to change categories`,
        "HTML",
        replyMarkup
    );
    
    await showCategoryMovies(env, chatId, userId);
}

async function showCategoryMovies(env, chatId, userId) {
    const users = await loadUsers(env);
    const movies = await loadMovies(env);
    
    if (!users[userId]) return;
    
    const user = users[userId];
    const selectedCategories = user.categories || [];
    
    if (selectedCategories.length === 0) {
        await sendMessage(chatId, "❌ No categories selected! Use /info to select categories.");
        return;
    }
    
    const categoryMovies = {};
    
    Object.entries(movies).forEach(([movieName, movieData]) => {
        const movieCategories = movieData.categories || [];
        
        if (movieCategories.length === 0 || 
            movieCategories.some(cat => selectedCategories.includes(cat))) {
            
            const matchScore = movieCategories.filter(cat => 
                selectedCategories.includes(cat)).length;
            
            categoryMovies[movieName] = {
                data: movieData,
                score: matchScore
            };
        }
    });
    
    const sortedMovies = Object.entries(categoryMovies)
        .sort((a, b) => b[1].score - a[1].score);
    
    let text = `🎬 <b>Movies in your categories:</b>\n`;
    text += `🏷️ Categories: ${selectedCategories.join(", ")}\n`;
    text += "━".repeat(40) + "\n\n";
    
    if (sortedMovies.length === 0) {
        text += "📭 <b>No movies found in your selected categories.</b>\n\n";
        text += "Try:\n";
        text += "• Searching for a specific movie\n";
        text += "• Using /resetcat to change categories\n";
        text += "• Requesting movies using /request";
    } else {
        sortedMovies.slice(0, 10).forEach(([movieName, movieInfo], i) => {
            const movieData = movieInfo.data;
            const desc = movieData.description ? 
                movieData.description.substring(0, 60) : "No description";
            const categoriesStr = movieData.categories && movieData.categories.length > 0 ?
                movieData.categories.join(", ") : "Uncategorized";
            
            text += `<b>${i + 1}. 🎬 ${movieName}</b>\n`;
            text += `   📝 ${desc}...\n`;
            if (categoriesStr) {
                text += `   🏷️ ${categoriesStr}\n`;
            }
            text += "\n";
        });
    }
    
    text += "━".repeat(40) + "\n";
    text += "💬 <b>Type movie name to get it!</b>\n";
    text += "🔄 Use /resetcat to change categories";
    
    await sendMessage(chatId, text);
}

async function handleMyInfo(env, message) {
    const userId = String(message.from.id);
    const chatId = message.chat.id;
    const users = await loadUsers(env);
    
    if (!users[userId]) {
        await sendMessage(chatId, "❌ User not found!");
        return;
    }
    
    const user = users[userId];
    const joinedDate = user.joined_date ? user.joined_date.substring(0, 10) : "N/A";
    const referralsDone = user.referrals_done || 0;
    const totalNeeded = user.total_referrals_needed || 1;
    const moviesRequested = user.movies_requested ? user.movies_requested.length : 0;
    const downloaded = user.downloaded ? user.downloaded.length : 0;
    const categories = user.categories || [];
    const categoriesSelected = user.categories_selected || false;
    
    const canAccess = await canUserAccess(env, parseInt(userId));
    const accessStatus = canAccess ? "✅ ACCESS GRANTED" : "❌ NEED REFERRAL";
    const categoryStatus = categoriesSelected ? "✅ SELECTED" : "❌ NOT SELECTED";
    
    const text = `👤 <b>Your Profile</b>
━━━━━━━━━━━━━━━━━━━
<b>Name:</b> ${user.name || 'N/A'}
<b>ID:</b> <code>${userId}</code>
<b>Joined:</b> ${joinedDate}
<b>Access Status:</b> ${accessStatus}
<b>Categories:</b> ${categoryStatus}

📊 <b>Stats:</b>
• 👥 Referrals: ${referralsDone}/${totalNeeded}
• 📥 Requested: ${moviesRequested}
• ⬇️ Downloaded: ${downloaded}

<b>🎭 Selected Categories:</b>
${categories.length > 0 ? categories.join(", ") : 'None (use /info to select)'}`;
    
    await sendMessage(chatId, text);
}

async function handleRequest(env, message) {
    const userId = String(message.from.id);
    const chatId = message.chat.id;
    const requestsData = await loadRequests(env);
    
    const userRequests = Object.values(requestsData).filter(req => 
        String(req.user_id) === userId
    );
    
    if (userRequests.length === 0) {
        await sendMessage(chatId, "📭 No requests yet!");
        return;
    }
    
    let text = "<b>📋 Your Requests:</b>\n\n";
    
    userRequests.forEach(req => {
        const status = req.status || "pending";
        const movieName = req.movie_name || "Unknown";
        const date = req.date ? req.date.substring(0, 10) : "";
        const statusEmoji = status === "pending" ? "⏳" : "✅";
        text += `${statusEmoji} <b>${movieName}</b>\n📅 ${date} - ${status.toUpperCase()}\n\n`;
    });
    
    await sendMessage(chatId, text);
}

async function handleHelp(env, message) {
    const userId = message.from.id;
    const chatId = message.chat.id;
    const isAdminUser = isAdmin(userId);
    
    let text = `🎬 <b>FILMFANATICZONE BOT HELP</b>
━━━━━━━━━━━━━━━━━━━
<b>👤 USER COMMANDS:</b>
/start - Start the bot
/referer - Get referral link
/info - Select categories & browse movies
/resetcat - Reset your categories
/request - Check your requests
/myinfo - Your profile
/help - This help message

💬 <b>How to use:</b>
1. Complete 1 referral using /referer
2. Use /info to select 2+ categories
3. Type movie name to get it!
4. Use /resetcat to change categories

<b>📢 Share in groups:</b>
<code>🎬 Get Movies & Series Here! @FilmFanaticZone_bot</code>`;
    
    if (isAdminUser) {
        text += `

<b>🔐 ADMIN COMMANDS:</b>
/add - Upload movie
/delete - Remove movie
/adminreq - View requests
/approve - Approve request
/adminusers - View users
/adminmovies - View movies
/adminstats - Statistics`;
    }
    
    await sendMessage(chatId, text);
}

async function handleMovieRequest(env, message) {
    const userId = String(message.from.id);
    const userName = message.from.first_name || "User";
    const chatId = message.chat.id;
    const movieQuery = message.text ? message.text.trim() : "";
    
    if (!movieQuery) return;
    
    const users = await loadUsers(env);
    
    if (!users[userId]) {
        await sendMessage(chatId, "❌ Please use /start first!");
        return;
    }
    
    const canAccess = await canUserAccess(env, parseInt(userId));
    if (!canAccess) {
        await sendMessage(
            chatId,
            "❌ <b>Complete referral first!</b>\n\nUse /referer to get your referral link\nComplete 1 referral to access movies!"
        );
        return;
    }
    
    const movies = await loadMovies(env);
    const requestsData = await loadRequests(env);
    
    let foundMovie = null;
    for (const movieName in movies) {
        if (movieName.toLowerCase() === movieQuery.toLowerCase()) {
            foundMovie = movieName;
            break;
        }
    }
    
    if (foundMovie) {
        const fileId = movies[foundMovie].file_id;
        
        if (fileId) {
            const caption = `🎬 <b>${foundMovie}</b>\n\n${movies[foundMovie].description || ''}`;
            const sent = await sendDocument(chatId, fileId, caption);
            
            if (sent) {
                if (!users[userId].downloaded) {
                    users[userId].downloaded = [];
                }
                
                if (!users[userId].downloaded.includes(foundMovie)) {
                    users[userId].downloaded.push(foundMovie);
                    await saveUsers(env, users);
                }
            } else {
                await sendMessage(chatId, "❌ Failed to send movie. Please try again.");
            }
        } else {
            await sendMessage(chatId, "⏳ Movie found but file not ready yet!");
        }
    } else {
        const reqId = `req_${Date.now()}_${userId}`;
        requestsData[reqId] = {
            user_id: parseInt(userId),
            user_name: userName,
            movie_name: movieQuery,
            status: "pending",
            date: new Date().toISOString()
        };
        
        if (!users[userId].movies_requested) {
            users[userId].movies_requested = [];
        }
        
        if (!users[userId].movies_requested.includes(movieQuery)) {
            users[userId].movies_requested.push(movieQuery);
        }
        
        await saveRequests(env, requestsData);
        await saveUsers(env, users);
        
        await sendMessage(
            chatId,
            `🔍 <b>Request Sent!</b>\n\n` +
            `🎬 Movie: <b>${movieQuery}</b>\n\n` +
            `✉️ Admin will add it soon!\n` +
            `Use /request to check status`
        );
        
        if (String(ADMIN_ID) !== userId) {
            await sendMessage(
                ADMIN_ID,
                `📝 <b>New Movie Request</b>\n\n` +
                `👤 User: ${userName}\n` +
                `🆔 ID: ${userId}\n` +
                `🎬 Movie: ${movieQuery}\n` +
                `📅 Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
            );
        }
    }
}

async function handleText(env, message) {
    const userId = String(message.from.id);
    const chatId = message.chat.id;
    const textContent = message.text ? message.text.trim() : "";
    
    if (textContent === "📋 View Selected") {
        await handleViewSelected(env, message);
        return;
    } else if (textContent === "🔄 Reset Categories") {
        await handleResetCat(env, message);
        await showCategoryKeyboard(env, chatId, userId);
        return;
    } else if (textContent === "✅ Done Selecting") {
        await handleDoneSelecting(env, message);
        return;
    }
    
    for (const category of CATEGORIES) {
        if (textContent === category || textContent === `✅ ${category}`) {
            await handleCategorySelection(env, message, category);
            return;
        }
    }
    
    await handleMovieRequest(env, message);
}

// ===================== ADMIN HANDLERS =====================
async function handleAdd(env, message) {
    const userId = message.from.id;
    const chatId = message.chat.id;
    
    if (!isAdmin(userId)) {
        await sendMessage(chatId, "❌ Admin only!");
        return;
    }
    
    await sendMessage(
        chatId,
        `📁 <b>Upload Movie</b>\n\n` +
        `Send file with caption:\n` +
        `<code>Movie Name | Category1, Category2 | Description</code>\n\n` +
        `<b>Example:</b>\n` +
        `<code>Inception | Action, Sci-Fi, Thriller | A thief who steals corporate secrets...</code>`
    );
}

async function handleDelete(env, message) {
    const userId = message.from.id;
    const chatId = message.chat.id;
    const text = message.text || "";
    
    if (!isAdmin(userId)) {
        await sendMessage(chatId, "❌ Admin only!");
        return;
    }
    
    const movieName = text.replace("/delete ", "").trim();
    if (!movieName) {
        await sendMessage(chatId, "Usage: /delete <movie_name>");
        return;
    }
    
    const movies = await loadMovies(env);
    
    if (movies[movieName]) {
        delete movies[movieName];
        await saveMovies(env, movies);
        await sendMessage(chatId, `🗑️ Deleted: <b>${movieName}</b>`);
    } else {
        await sendMessage(chatId, "❌ Movie not found!");
    }
}

async function handleAdminReq(env, message) {
    const userId = message.from.id;
    const chatId = message.chat.id;
    
    if (!isAdmin(userId)) {
        await sendMessage(chatId, "❌ Admin only!");
        return;
    }
    
    const requestsData = await loadRequests(env);
    const pending = Object.values(requestsData).filter(req => 
        req.status === "pending"
    );
    
    if (pending.length === 0) {
        await sendMessage(chatId, "✅ No pending requests!");
        return;
    }
    
    let text = `<b>📋 Pending Requests: ${pending.length}</b>\n\n`;
    let count = 0;
    
    for (const [reqId, req] of Object.entries(requestsData)) {
        if (req.status === "pending" && count < 15) {
            const date = req.date ? req.date.substring(0, 10) : "";
            text += `🎬 ${req.movie_name}\n`;
            text += `👤 ${req.user_name}\n`;
            text += `🆔 Request ID: <code>${reqId}</code>\n`;
            text += `📅 ${date}\n`;
            text += "━".repeat(30) + "\n\n";
            count++;
        }
    }
    
    text += "Use: /approve <request_id>";
    await sendMessage(chatId, text);
}

async function handleApprove(env, message) {
    const userId = message.from.id;
    const chatId = message.chat.id;
    const text = message.text || "";
    
    if (!isAdmin(userId)) {
        await sendMessage(chatId, "❌ Admin only!");
        return;
    }
    
    const reqId = text.replace("/approve ", "").trim();
    if (!reqId) {
        await sendMessage(chatId, "Usage: /approve <request_id>");
        return;
    }
    
    const requestsData = await loadRequests(env);
    
    if (!requestsData[reqId]) {
        await sendMessage(chatId, "❌ Request not found!");
        return;
    }
    
    const req = requestsData[reqId];
    req.status = "completed";
    req.approved_date = new Date().toISOString();
    req.approved_by = userId;
    
    await saveRequests(env, requestsData);
    
    await sendMessage(
        req.user_id,
        `✅ <b>Request Approved!</b>\n\n` +
        `🎬 Movie: ${req.movie_name}\n\n` +
        `You can now search for this movie!`
    );
    
    await sendMessage(chatId, `✅ Approved: ${req.movie_name}`);
}

async function handleAdminUsers(env, message) {
    const userId = message.from.id;
    const chatId = message.chat.id;
    
    if (!isAdmin(userId)) {
        await sendMessage(chatId, "❌ Admin only!");
        return;
    }
    
    const users = await loadUsers(env);
    let text = `<b>👥 Total Users: ${Object.keys(users).length}</b>\n\n`;
    let count = 0;
    
    for (const [userIdData, user] of Object.entries(users)) {
        if (count >= 15) break;
        
        const referralsDone = user.referrals_done || 0;
        const totalNeeded = user.total_referrals_needed || 1;
        const status = referralsDone >= totalNeeded ? "✅" : "❌";
        const name = user.name || 'Unknown';
        const joined = user.joined_date ? user.joined_date.substring(0, 10) : '';
        
        text += `${status} ${name}\n`;
        text += `🆔 ${userIdData}\n`;
        text += `📅 ${joined} | Ref: ${referralsDone}/${totalNeeded}\n`;
        text += "━".repeat(30) + "\n\n";
        count++;
    }
    
    await sendMessage(chatId, text);
}

async function handleAdminMovies(env, message) {
    const userId = message.from.id;
    const chatId = message.chat.id;
    
    if (!isAdmin(userId)) {
        await sendMessage(chatId, "❌ Admin only!");
        return;
    }
    
    const movies = await loadMovies(env);
    let text = `<b>🎬 Total Movies: ${Object.keys(movies).length}</b>\n\n`;
    let count = 0;
    
    for (const [movieName, movieData] of Object.entries(movies)) {
        if (count >= 15) break;
        
        const categories = movieData.categories || [];
        let categoriesStr = categories.slice(0, 3).join(", ");
        if (categories.length === 0) categoriesStr = "No categories";
        if (categories.length > 3) {
            categoriesStr += `... (+${categories.length - 3} more)`;
        }
        
        const added = movieData.added_date ? movieData.added_date.substring(0, 10) : '';
        
        text += `🎬 ${movieName}\n`;
        text += `🏷️ ${categoriesStr}\n`;
        text += `📅 Added: ${added}\n`;
        text += "━".repeat(30) + "\n\n";
        count++;
    }
    
    await sendMessage(chatId, text);
}

async function handleAdminStats(env, message) {
    const userId = message.from.id;
    const chatId = message.chat.id;
    
    if (!isAdmin(userId)) {
        await sendMessage(chatId, "❌ Admin only!");
        return;
    }
    
    const users = await loadUsers(env);
    const movies = await loadMovies(env);
    const requestsData = await loadRequests(env);
    
    const activeUsers = Object.values(users).filter(u => 
        (u.referrals_done || 0) >= (u.total_referrals_needed || 1)
    ).length;
    
    const pendingRequests = Object.values(requestsData).filter(r => 
        r.status === "pending"
    ).length;
    
    const completedRequests = Object.values(requestsData).filter(r => 
        r.status === "completed"
    ).length;
    
    const usersWithCats = Object.values(users).filter(u => 
        u.categories_selected
    ).length;
    
    const categoryCounts = {};
    Object.values(movies).forEach(movieData => {
        (movieData.categories || []).forEach(cat => {
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });
    });
    
    const topCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    let text = `📊 <b>BOT STATISTICS</b>
━━━━━━━━━━━━━━━━━━━
<b>👥 Users:</b>
• Total Users: ${Object.keys(users).length}
• Active Users: ${activeUsers}
• With Categories: ${usersWithCats}

<b>🎬 Movies:</b>
• Total Movies: ${Object.keys(movies).length}
• With Categories: ${Object.values(movies).filter(m => m.categories && m.categories.length > 0).length}

<b>📋 Requests:</b>
• Pending: ${pendingRequests}
• Completed: ${completedRequests}
• Total: ${Object.keys(requestsData).length}

<b>🏷️ Top Categories:</b>`;
    
    if (topCategories.length > 0) {
        topCategories.forEach(([cat, count]) => {
            text += `\n• ${cat}: ${count} movies`;
        });
    } else {
        text += "\n• No categories assigned";
    }
    
    await sendMessage(chatId, text);
}

// ===================== MAIN HANDLER =====================
export default {
    async fetch(request, env, ctx) {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                }
            });
        }
        
        if (request.method !== 'POST') {
            return new Response('Method not allowed', { status: 405 });
        }
        
        try {
            const update = await request.json();
            
            // Log incoming request
            const timestamp = new Date().toLocaleString('en-IN', { 
                timeZone: 'Asia/Kolkata',
                dateStyle: 'medium',
                timeStyle: 'medium'
            });
            
            console.log(`📨 Incoming update at ${timestamp}:`, 
                update.message ? update.message.text || 'Document/File' : 'No message');
            
            // Handle file uploads (Admin only)
            if (update.message && update.message.document) {
                const message = update.message;
                const userId = message.from.id;
                const chatId = message.chat.id;
                const caption = message.caption || "";
                const fileId = message.document.file_id;
                
                if (isAdmin(userId)) {
                    if (caption && caption.includes("|")) {
                        const parts = caption.split("|").map(p => p.trim());
                        if (parts.length >= 2) {
                            const movieName = parts[0];
                            let categories = [];
                            let description = "";
                            
                            if (parts.length === 2) {
                                description = parts[1];
                            } else {
                                categories = parts[1].split(",").map(cat => cat.trim());
                                description = parts[2];
                            }
                            
                            const movies = await loadMovies(env);
                            movies[movieName] = {
                                file_id: fileId,
                                description: description,
                                categories: categories,
                                added_date: new Date().toISOString(),
                                added_by: userId
                            };
                            
                            if (await saveMovies(env, movies)) {
                                const categoriesStr = categories.length > 0 ? 
                                    categories.join(", ") : "No categories";
                                
                                await sendMessage(
                                    chatId,
                                    `✅ <b>Movie Added!</b>\n` +
                                    `🎬 ${movieName}\n` +
                                    `🏷️ ${categoriesStr}\n` +
                                    `📝 ${description.substring(0, 100)}...`
                                );
                                
                                console.log(`✅ Movie added by admin: ${movieName}`);
                            }
                        } else {
                            await sendMessage(
                                chatId, 
                                "❌ Format: <code>Movie Name | Category1, Category2 | Description</code>"
                            );
                        }
                    } else {
                        await sendMessage(
                            chatId,
                            "❌ Please include caption with format:\n<code>Movie Name | Category1, Category2 | Description</code>"
                        );
                    }
                } else {
                    await sendMessage(chatId, "❌ Admin only!");
                }
                
                return new Response(JSON.stringify({ ok: true }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            // Route text commands
            if (update.message && update.message.text) {
                const message = update.message;
                const text = message.text;
                
                if (text === "/start" || text.startsWith("/start ")) {
                    await handleStart(env, message);
                } else if (text === "/referer") {
                    await handleReferer(env, message);
                } else if (text === "/info") {
                    await handleInfo(env, message);
                } else if (text === "/resetcat") {
                    await handleResetCat(env, message);
                } else if (text === "/myinfo") {
                    await handleMyInfo(env, message);
                } else if (text === "/request") {
                    await handleRequest(env, message);
                } else if (text === "/help") {
                    await handleHelp(env, message);
                } else if (text === "/add") {
                    await handleAdd(env, message);
                } else if (text.startsWith("/delete ")) {
                    await handleDelete(env, message);
                } else if (text === "/adminreq") {
                    await handleAdminReq(env, message);
                } else if (text.startsWith("/approve ")) {
                    await handleApprove(env, message);
                } else if (text === "/adminusers") {
                    await handleAdminUsers(env, message);
                } else if (text === "/adminmovies") {
                    await handleAdminMovies(env, message);
                } else if (text === "/adminstats") {
                    await handleAdminStats(env, message);
                } else if (text && !text.startsWith("/")) {
                    await handleText(env, message);
                }
            }
            
            return new Response(JSON.stringify({ ok: true }), {
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
            
        } catch (error) {
            console.error('❌ Error processing request:', error);
            
            // Send error to admin
            try {
                await sendMessage(
                    ADMIN_ID,
                    `❌ <b>Bot Error</b>\n\n` +
                    `Error: ${error.message}\n` +
                    `Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
                );
            } catch (e) {
                console.error('Failed to send error notification:', e);
            }
            
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
    }
};