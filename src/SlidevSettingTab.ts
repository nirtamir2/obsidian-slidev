import type { App, Debouncer } from "obsidian";
import { Notice, PluginSettingTab, Setting, debounce } from "obsidian";
import type { SlidevPlugin } from "./SlidevPlugin";
import { diagnoseSlidevProject } from "./launcher/slidevLauncher";
import { DEFAULT_SETTINGS, isPortNumber } from "./settings";

export class SlidevSettingTab extends PluginSettingTab {
  plugin: SlidevPlugin;
  private readonly saveSettingsDebounced: Debouncer<[], void>;

  constructor(app: App, plugin: SlidevPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.saveSettingsDebounced = debounce(() => {
      void plugin.saveSettings();
    }, 750);
  }

  display(): void {
    this.containerEl.empty();
    this.addPortSetting();
    this.addSlidevProjectSetting();
    this.addNodeExecutableSetting();
    this.addShouldRenderSlideNumberInMarkdownPreviewSetting();
    this.addDebugModeSetting();
  }

  private addPortSetting() {
    new Setting(this.containerEl)
      .setName("Port")
      .setDesc("Port used by the local Slidev server (1–65535).")
      .addText((text) =>
        text
          .setPlaceholder(String(DEFAULT_SETTINGS.port))
          .setValue(String(this.plugin.settings.port))
          .onChange((value) => {
            const parsedNumber = Number(value);
            if (!isPortNumber(parsedNumber)) {
              void new Notice("Port must be an integer between 1 and 65535.");
              return;
            }
            this.plugin.settings.port = parsedNumber;
            this.saveSettingsDebounced();
          }),
      );
  }

  private addDebugModeSetting() {
    new Setting(this.containerEl)
      .setName("Debug mode")
      .setDesc(
        "Show server controls and process output in the presentation view.",
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.isDebug)
          .onChange(async (value) => {
            this.plugin.settings.isDebug = value;
            await this.plugin.saveSettings();
          }),
      );
  }

  private addShouldRenderSlideNumberInMarkdownPreviewSetting() {
    new Setting(this.containerEl)
      .setName("Show slide numbers in reading view")
      .setDesc(
        "Show the next slide number beside Slidev separators in reading view.",
      )
      .addToggle((toggle) =>
        toggle
          .setValue(
            this.plugin.settings.shouldRenderSlideNumberInMarkdownPreview,
          )
          .onChange(async (value) => {
            this.plugin.settings.shouldRenderSlideNumberInMarkdownPreview =
              value;
            await this.plugin.saveSettings();
          }),
      );
  }

  private addNodeExecutableSetting() {
    new Setting(this.containerEl)
      .setName("Node.js executable")
      .setDesc(
        "Leave blank to find Node.js on PATH, or enter the full path to the Node.js executable.",
      )
      .addText((text) =>
        text
          .setPlaceholder("/path/to/node")
          .setValue(this.plugin.settings.nodeExecutable)
          .onChange((value) => {
            this.plugin.settings.nodeExecutable = value.trim();
            this.saveSettingsDebounced();
          }),
      );
  }

  private addSlidevProjectSetting() {
    const projectSetting = new Setting(this.containerEl)
      .setName("Slidev project folder")
      .setDesc("Folder containing a project-local installation of @slidev/cli.")
      .addText((text) =>
        text
          .setPlaceholder("/path/to/slidev-project")
          .setValue(this.plugin.settings.slidevTemplateLocation)
          .onChange((value) => {
            this.plugin.settings.slidevTemplateLocation = value.trim();
            this.saveSettingsDebounced();
          }),
      );

    const statusEl = projectSetting.infoEl.createDiv({
      cls: "slidev-setting-status",
    });

    projectSetting.addButton((button) => {
      button.setButtonText("Verify").onClick(async () => {
        button.setDisabled(true);
        statusEl.removeClass("slidev-setting-status--success");
        statusEl.removeClass("slidev-setting-status--error");
        statusEl.setText("Checking the local Slidev installation…");

        try {
          const diagnosis = await diagnoseSlidevProject({
            projectPath: this.plugin.settings.slidevTemplateLocation,
            nodeExecutable: this.plugin.settings.nodeExecutable,
          });

          if (diagnosis.ok) {
            statusEl.addClass("slidev-setting-status--success");
            statusEl.setText(
              `Ready: @slidev/cli will run with ${diagnosis.project.nodeVersion}.`,
            );
          } else {
            statusEl.addClass("slidev-setting-status--error");
            statusEl.setText(diagnosis.message);
          }
        } finally {
          button.setDisabled(false);
        }
      });
    });
  }
}
