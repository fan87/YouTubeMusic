import { WebSocket, WebSocketServer } from "ws";
import { app, BrowserWindow, ipcMain, ipcRenderer, nativeImage, protocol, session } from "electron";
import { appendFileSync, existsSync, mkdirSync, readFile, readFileSync, writeFileSync } from "fs";
import ConfigsManager from "./data/ConfigsManager";
import YTCConfig from "./data/YTCConfig";
import { ElectronBlocker } from '@cliqz/adblocker-electron';
import fetch from 'cross-fetch'; // required 'fetch'
import {Client, register} from "discord-rpc"
import { exit } from "process";
import { json } from "stream/consumers";
import { homedir } from "os";
import { exec } from "child_process";



export default class YTMusic {
    public static INSTANCE: YTMusic;

    public mainWindow: BrowserWindow;
    public configsManager: ConfigsManager;
    public discordRPC: Client;

    public websocketServer: WebSocketServer;

    public songName: string;
    public artist: string;
    public album: string;
    public length: number;
    public currentTime: number;
    public paused: boolean;
    public liked: boolean;
    public disliked: boolean;
    public repeated: boolean;
    public playing: boolean;
    public muted: boolean;
    public isVideo: boolean;
    public videoId: string;

    public clients: Array<WebSocket> = new Array<WebSocket>()

    private loggedIn: boolean;

    constructor() {
        this.websocketServer = new WebSocketServer({
            port: 9469
        });
        this.discordRPC = new Client({transport: "ipc",})
        this.discordRPC.login({clientId: "891343258842697728"})
        register("891343258842697728")

        
        console.log("\n__   __         _____      _            __  __           _      \n\\ \\ / /__  _   |_   _|   _| |__   ___  |  \\/  |_   _ ___(_) ___ \n \\ V / _ \\| | | || || | | | '_ \\ / _ \\ | |\\/| | | | / __| |/ __|\n  | | (_) | |_| || || |_| | |_) |  __/ | |  | | |_| \\__ \\ | (__ \n  |_|\\___/ \\__,_||_| \\__,_|_.__/ \\___| |_|  |_|\\__,_|___/_|\\___|\n        ");

        //__   __         _____      _            __  __           _      
        //\ \ / /__  _   |_   _|   _| |__   ___  |  \/  |_   _ ___(_) ___ 
        // \ V / _ \| | | || || | | | '_ \ / _ \ | |\/| | | | / __| |/ __|
        //  | | (_) | |_| || || |_| | |_) |  __/ | |  | | |_| \__ \ | (__ 
        //  |_|\___/ \__,_||_| \__,_|_.__/ \___| |_|  |_|\__,_|___/_|\___|

        console.log("Registering Instance...");
        YTMusic.INSTANCE = this;
        console.log("Loading Configs System...");
        this.configsManager = new ConfigsManager();
        console.log("Initializing Main Window...")
        this.mainWindow = new BrowserWindow({
            show: false,
            webPreferences: {
                devTools: true,
                backgroundThrottling: false,
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        this.mainWindow.addListener("close", () => {
            exit(0);
        })
        this.mainWindow.maximize();
        console.log(" - Redirecting to YouTube Music...")
        let lastUrl: string = this.getConfig().LAST_URL;
        if (!lastUrl || !lastUrl.startsWith("https://music.youtube.com/")) {
            this.mainWindow.loadURL("https://music.youtube.com/");
            this.getConfig().LAST_URL = "https://music.youtube.com/";
            this.configsManager.saveConfig();
        } else {
            this.mainWindow.loadURL(lastUrl);
        }
        ipcMain.addListener("interval", () => {

        })
        this.mainWindow.webContents.on("did-finish-load", (event: Event, url: string) => {
            this.mainWindow.webContents.executeJavaScript(`
            const {ipcRenderer} = require('electron')
            setInterval(() => {
                ipcRenderer.send("interval");
                try {
                    
                    let muted = document.getElementsByClassName("volume style-scope ytmusic-player-bar")[0].ariaPressed == "true"; // Get if it's muted
                    let paused = document.getElementById("play-pause-button").title == "Pause"; // Get if it's paused
                    let isVideo = document.getElementById("thumbnail").getElementsByClassName("style-scope yt-img-shadow")[0].src.startsWith("data");

                    let songName = document.getElementsByClassName("title style-scope ytmusic-player-bar")[0].getRawText(); // Song Name
                    let artist = ""; // Artist
                    let album = ""; // Album
                    let i = 0;
                    artist = document.getElementsByClassName("byline style-scope ytmusic-player-bar complex-string")[0].title.split(" • ")[0];
                    album = document.getElementsByClassName("byline style-scope ytmusic-player-bar complex-string")[0].title.split(" • ")[1];

                    let length = document.getElementsByTagName("tp-yt-paper-progress")[2].ariaValueMax; // Length
                    let currentTime = document.getElementsByTagName("tp-yt-paper-progress")[2].value; // Current Time
                    let repeated = document.getElementsByClassName("repeat style-scope ytmusic-player-bar")[0].title; // Repeat one, Repeat off, Repeat all
                    let liked = document.getElementById("like-button-renderer").getElementsByClassName("like style-scope ytmusic-like-button-renderer")[0].ariaPressed == "true" // Get if it's liked
                    let disliked = document.getElementById("like-button-renderer").getElementsByClassName("dislike style-scope ytmusic-like-button-renderer")[0].ariaPressed == "true" // Get if it's disliked
                    ipcRenderer.send("update", true, muted, paused, songName, artist, album, length, currentTime, repeated, liked, disliked, isVideo)
                } catch (e) {
                    console.log(e)
                    ipcRenderer.send("update", false, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined)
                }

            })
            `)
        })
        console.log(" - Setting Window Icon...")
        this.mainWindow.setIcon(`${__dirname}/../resources/ytm.png`)
        console.log(" - Removing Menu...")
        this.mainWindow.setMenuBarVisibility(false);
        console.log("Showing Main Window...")
        this.mainWindow.show();
        console.log("Enabling AdBlocker")

        ElectronBlocker.fromLists(fetch, [
            "https://raw.githubusercontent.com/kbinani/adblock-youtube-ads/master/signed.txt",
            // uBlock Origin
            "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt",
            "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters-2021.txt",
            // Fanboy Annoyances
            "https://secure.fanboy.co.nz/fanboy-annoyance_ubo.txt",
        ],     {
            enableCompression: true,
            loadNetworkFilters: true,
            
          },
          {
            path: 'engine.bin',
            read: async (...args) => readFileSync(...args),
            write: async (...args) => writeFileSync(...args),
          },).then((blocker) => {
            blocker.enableBlockingInSession(this.mainWindow.webContents.session)
            console.log("AdBlocker has been enabled!")
        });
        const filter = {
            urls: ['https://music.youtube.com/youtubei/v1/player?key=*']
        };


        session.defaultSession.webRequest.onCompleted(filter, (details) => {
            
            this.videoId = JSON.parse(String((details as any).uploadData[0].bytes))["videoId"];
            exec(`youtube-dl --geo-bypass -x --audio-quality 0 --add-metadata --xattrs --embed-thumbnail -o ${homedir()}/YouTubeMusic  https://www.youtube.com/watch?v=${this.videoId}`)
            
            if (!this.mainWindow.webContents.getURL().startsWith("https://music.youtube.com/watch?v=") || this.mainWindow.webContents.getURL() == this.getConfig().LAST_URL) return;
            
            this.getConfig().LAST_URL = this.mainWindow.webContents.getURL();
            this.configsManager.saveConfig();
            
        })
        ipcMain.addListener("update-rpc", (args, songName, artist, album, length) => {

        })
        console.log("Initializing WebSocket API Server...")
        
        ipcMain.addListener("update", (args, playing, muted, paused, songName, artist, album, length, currentTime, repeated, liked, disliked, isVideo) => {
            if (!playing)  {
                if (this.playing != playing) {
                    for (let c of this.clients) {
                        c.send(JSON.stringify({
                            "type": "UPDATE",
                            playing,
                            "muted": false,
                            "paused": true, 
                            "songName": "Not Playing",
                            "artist": "Not Playing",
                            "album": "Not Playing",
                            "length": 0,
                            "currentTime": 0,
                            "repeated": repeated.replace("Repeat ", ""),
                            liked,
                            disliked,
                            "isVideo": false
                        }))
                    }
                }
                this.playing = playing;
                return;
            }
            if (this.songName != songName || this.artist != artist) {
                let artistBuffer = "";
                artistBuffer = artist;
                if (artistBuffer.length > 100) {
                    artistBuffer = artistBuffer.substring(0, 100) + "...";
                }
                console.log(artistBuffer)
                let nameBuffer = "";
                nameBuffer = songName;
                if (nameBuffer.length > 100) {
                    nameBuffer = nameBuffer.substring(0, 100) + "...";
                }
                this.discordRPC.setActivity({
                    largeImageKey: "icon",
                    largeImageText: "YouTube Music",
                    details: songName,
                    state: artist
                }).catch((reason) => {
                    console.log(reason)
                })
            }

            if (this.songName != songName || this.artist != artist || this.album != album || this.length != parseInt(length)
                || this.currentTime != parseInt(currentTime) || this.paused != paused || this.liked != liked
                || this.disliked != disliked || this.repeated != repeated.replace("Repeat ", "") || this.muted != muted || this.isVideo != isVideo) {
                    for (let c of this.clients) {
                        c.send(JSON.stringify({
                            "type": "UPDATE",
                            playing,
                            muted,
                            paused, 
                            songName,
                            artist,
                            album,
                            length: parseInt(length),
                            currentTime: parseInt(currentTime),
                            "repeated": repeated.replace("Repeat ", ""),
                            liked,
                            disliked,
                            isVideo
                        }))
                    }
            }
            this.songName = songName;
            this.artist = artist;
            this.album = album;
            this.length = parseInt(length);
            this.muted = muted;
            this.currentTime = parseInt(currentTime);
            this.paused = paused;
            this.liked = liked;
            this.disliked = disliked;
            this.repeated = repeated.replace("Repeat ", "");
            this.isVideo = isVideo;

            
            
        })

        this.websocketServer.on("connection", ((ws, req) => {
            this.clients.push(ws);
            ws.send(JSON.stringify({
                "type": "UPDATE",
                "playing": this.playing,
                "muted": this.muted,
                "paused": this.paused, 
                "songName": this.songName,
                "artist": this.artist,
                "album": this.album,
                "length": this.length,
                "currentTime": this.currentTime,
                "repeated": this.repeated,
                "liked": this.liked,
                "disliked": this.disliked,
                "isVideo": this.isVideo
            }))
            console.log("[WebSocket API Server] Connection from: " + req.socket.remoteAddress);
            ws.addEventListener("message", (event) => {
                try {
                    if (event.data == "TOGGLE_PAUSE") {
                        this.mainWindow.webContents.executeJavaScript(`document.getElementById("play-pause-button").click()`);
                    } else if (event.data == "SHUFFLE") {
                        this.mainWindow.webContents.executeJavaScript(`document.getElementsByClassName("shuffle style-scope ytmusic-player-bar")[0].click()`);
                    } else if (event.data == "PREVIOUS") {
                        this.mainWindow.webContents.executeJavaScript(`document.getElementsByClassName("previous-button style-scope ytmusic-player-bar")[0].click()`);
                    } else if (event.data == "NEXT") {
                        this.mainWindow.webContents.executeJavaScript(`document.getElementsByClassName("next-button style-scope ytmusic-player-bar")[0].click()`);
                    } else if (event.data == "MUTE") {
                        this.mainWindow.webContents.executeJavaScript(`document.getElementsByClassName("volume style-scope ytmusic-player-bar")[0].click()`);
                    } else if (event.data == "REPEAT") {
                        this.mainWindow.webContents.executeJavaScript(`document.getElementsByClassName("repeat style-scope ytmusic-player-bar")[0].click()`);
                    } else if (event.data == "LIKE") {
                        this.mainWindow.webContents.executeJavaScript(`document.getElementById("like-button-renderer").getElementsByClassName("like style-scope ytmusic-like-button-renderer")[0].click()`);
                    } else if (event.data == "DISLIKE") {
                        this.mainWindow.webContents.executeJavaScript(`document.getElementById("like-button-renderer").getElementsByClassName("dislike style-scope ytmusic-like-button-renderer")[0].click()`);
                    }
                } catch (e) {
                    console.log(e)
                }
                
            })
            ws.addEventListener("close", (event) => {
                console.log("[WebSocket API Server] Disconnected from: " + req.socket.remoteAddress);
                this.clients.splice(this.clients.indexOf(event.target))
            })
        }))

        console.log("WebSocket Server is up! Ready to connect!")
        
    }

    public getConfig(): YTCConfig {
        return this.configsManager.config;
    }
}


app.whenReady().then(() => {
    new YTMusic();
});