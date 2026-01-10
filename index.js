${status} ${name}\n`;
        text += `🆔 ${userIdData}\n`;
        text += `📅 ${joined} | Ref: ${referralsDone}/${totalNeeded}\n`;
        text += "━".repeat(30) + "\n\n";
        count++;
    }
    
    await sendMessage(chatId, text);
}

async  handleAdminMovies(env, message) {
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
