import { platform } from "node:os";
import type { App } from "obsidian";
import { Notice, PluginSettingTab, Setting, debounce } from "obsidian";
import type { SlidevPlugin } from "./SlidevPlugin";
import { isSlidevCommandExistsInLocation } from "./utils/isSlidevCommandExistsInLocation";

export interface SlidevPluginSettings {
  port: number;
  initialScript: string;
  isDebug: boolean;
  slidevTemplateLocation: string;
  shouldRenderSlideNumberInMarkdownPreview: boolean;
}

const isWindows = platform() === "win32";

export const DEFAULT_SETTINGS: SlidevPluginSettings = {
  port: 3030,
  initialScript: isWindows ? "" : "source $HOME/.profile",
  isDebug: false,
  slidevTemplateLocation: "",
  shouldRenderSlideNumberInMarkdownPreview: false,
};

function isPortNumber(parsedNumber: number) {
  return (
    Number.isInteger(parsedNumber) && parsedNumber > 0 && parsedNumber < 65535
  );
}

export class SlidevSettingTab extends PluginSettingTab {
  plugin: SlidevPlugin;

  constructor(app: App, plugin: SlidevPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    this.containerEl.empty();
    this.addPortSetting();
    this.addSlidevTemplateLocationSetting();
    this.addInitialScriptSetting();
    this.addShouldRenderSlideNumberInMarkdownPreviewSetting();
    this.addDebugModeSetting();
  }

  private addPortSetting() {
    new Setting(this.containerEl)
      .setName("Port")
      .setDesc("Slidev port Number")
      .addText((text) =>
        text
          .setPlaceholder(String(DEFAULT_SETTINGS.port))
          .setValue(String(this.plugin.settings.port))
          .onChange(
            debounce(async (value) => {
              const parsedNumber = Number(value);
              if (!isPortNumber(parsedNumber)) {
                void new Notice("Port should be an integer");
                return;
              }
              this.plugin.settings.port = parsedNumber;
              await this.plugin.saveSettings();
            }, 750),
          ),
      );
  }

  private addDebugModeSetting() {
    new Setting(this.containerEl)
      .setName("Debug mode")
      .setDesc("Should show debug mode")
      .addToggle((value) =>
        value.setValue(this.plugin.settings.isDebug).onChange(
          debounce(async (value) => {
            this.plugin.settings.isDebug = value;
            await this.plugin.saveSettings();
          }, 750),
        ),
      );
  }
  
  private addShouldRenderSlideNumberInMarkdownPreviewSetting() {
    new Setting(this.containerEl)
      .setName("Markdown preview slide number")
      .setDesc("Should render slide number in markdown preview")
      .addToggle((value) =>
        value.setValue(this.plugin.settings.shouldRenderSlideNumberInMarkdownPreview).onChange(
          debounce(async (value) => {
            this.plugin.settings.shouldRenderSlideNumberInMarkdownPreview = value;
            await this.plugin.saveSettings();
          }, 750),
        ),
      );
  }

  private addInitialScriptSetting() {
    new Setting(this.containerEl)
      .setName("Initial script")
      .setDesc("The script to load Node.js to PATH")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.initialScript)
          .setValue(this.plugin.settings.initialScript)
          .onChange(
            debounce(async (value) => {
              this.plugin.settings.initialScript = value;
              await this.plugin.saveSettings();
            }, 750),
          ),
      );
  }

  private addSlidevTemplateLocationSetting() {
    const templateLocationSetting = new Setting(this.containerEl)
      .setName("Slidev template location")
      .setDesc("The template location used by Slidev")
      .addText((text) => {
        text
          .setPlaceholder(DEFAULT_SETTINGS.slidevTemplateLocation)
          .setValue(this.plugin.settings.slidevTemplateLocation)
          .onChange(
            debounce(async (value) => {
              this.plugin.settings.slidevTemplateLocation = value;
              await this.plugin.saveSettings();
            }, 750),
          );
      });

    const templateLocationDescriptionNode = document.createElement("div");
    templateLocationSetting.infoEl.append(templateLocationDescriptionNode);

    async function handleVerifySlidevTemplate(location: string) {
      const isValid = await isSlidevCommandExistsInLocation(location);
      if (isValid) {
        templateLocationDescriptionNode.textContent = "Location is valid";
        templateLocationDescriptionNode.className = "text-xs text-green-500";
      } else {
        templateLocationDescriptionNode.textContent =
          "Location is invalid. slidev command not exits.";
        templateLocationDescriptionNode.className = "text-xs text-red-500";
      }
    }

    templateLocationSetting.addButton((button) => {
      button.setButtonText("Verify").onClick(() => {
        void handleVerifySlidevTemplate(
          this.plugin.settings.slidevTemplateLocation,
        );
      });

      void handleVerifySlidevTemplate(
        this.plugin.settings.slidevTemplateLocation,
      );
    });
  }
}
