import { mkdirSync, existsSync, writeFileSync, readFileSync } from "fs";
import YTCConfig from "./YTCConfig";

export default class ConfigsManager {

    public config: YTCConfig;

    public saveConfig(): void {
        writeFileSync(".run/config.json", JSON.stringify(this.config, null, 4))
    }

    constructor() {
        try {
            mkdirSync(".run")
        } catch (e) {
            
        }
        if (!existsSync(".run/config.json")) {
            this.config = new YTCConfig()
            writeFileSync(".run/config.json", JSON.stringify(this.config, null, 4))
        } else {
            let data = readFileSync(".run/config.json");
            this.config = JSON.parse(data.toString());
            writeFileSync(".run/config.json", JSON.stringify(this.config, null, 4))
        }
    }
}