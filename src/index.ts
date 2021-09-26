import AsciiArt from "ascii-art";
import { app, BrowserWindow, ipcMain, ipcRenderer, nativeImage, protocol, session } from "electron";
import { appendFileSync, existsSync, mkdirSync, readFile, readFileSync, writeFileSync } from "fs";
import ConfigsManager from "./data/ConfigsManager";
import YTCConfig from "./data/YTCConfig";
import { ElectronBlocker } from '@cliqz/adblocker-electron';
import fetch from 'cross-fetch'; // required 'fetch'
import {Client, register} from "discord-rpc"



export default class YTMusic {
    public static INSTANCE: YTMusic;

    public mainWindow: BrowserWindow;
    public configsManager: ConfigsManager;
    public discordRPC: Client;

    private loggedIn: boolean;

    constructor() {
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
                ipcRenderer.send("interval")
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
            if (!this.loggedIn) {
                this.discordRPC.login({clientId: "891343258842697728"}).then(() => {
                    this.loggedIn = true;
                    this.mainWindow.webContents.executeJavaScript(`
                        setTimeout(() => {
                            ipcRenderer.send("update-rpc", document.getElementsByClassName("title style-scope ytmusic-player-bar")[0].getRawText(), document.getElementsByClassName("yt-simple-endpoint style-scope yt-formatted-string")[0].text, document.getElementsByClassName("yt-simple-endpoint style-scope yt-formatted-string")[1].text, document.getElementsByTagName("tp-yt-paper-progress")[2].ariaValueMax)
                        }, 1000)
                    `).catch((reason) => {

                    })
                })
            }

            
            if (!this.mainWindow.webContents.getURL().startsWith("https://music.youtube.com/watch?v=") || this.mainWindow.webContents.getURL() == this.getConfig().LAST_URL) return;
            
            this.getConfig().LAST_URL = this.mainWindow.webContents.getURL();
            this.configsManager.saveConfig();
            
        })
        ipcMain.addListener("update-rpc", (args, songName, artist, album, length) => {
            this.discordRPC.setActivity({
                largeImageKey: "icon",
                largeImageText: "YouTube Music",
                details: songName,
                state: artist
            }).catch((reason) => {
                console.log(reason)
            })
        })
    }

    public getConfig(): YTCConfig {
        return this.configsManager.config;
    }
}


app.whenReady().then(() => {
    new YTMusic();
});