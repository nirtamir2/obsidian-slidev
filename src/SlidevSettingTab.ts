import type { App, Debouncer, SettingDefinitionItem } from "obsidian";
import { Notice, PluginSettingTab, Setting, debounce } from "obsidian";
import type { SlidevPlugin } from "./SlidevPlugin";
import { diagnoseSlidevProject } from "./launcher/slidevLauncher";
import { DEFAULT_SETTINGS, isPortNumber } from "./settings";
import {
  getQuickSetupControl,
  shouldOfferQuickSetup,
} from "./setup/quickSetupState";

interface SettingCopy {
  desc: string;
  name: string;
}

const settingCopy = {
  debugMode: {
    name: "Debug mode",
    desc: "Show server controls and process output in the presentation view.",
  },
  nodeExecutable: {
    name: "Node.js executable",
    desc: "Leave blank to find Node.js on PATH, or enter the full path to the Node.js executable.",
  },
  port: {
    name: "Port",
    desc: "Port used by the local Slidev server (1–65535).",
  },
  quickSetup: {
    name: "Quick setup",
    desc: "Create .slidev in this vault, download the maintained packages, and run their npm install scripts.",
  },
  shouldRenderSlideNumberInMarkdownPreview: {
    name: "Show slide numbers in reading view",
    desc: "Show the next slide number beside Slidev separators in reading view.",
  },
  slidevProject: {
    name: "Slidev project folder",
    desc: "Folder containing a project-local installation of @slidev/cli.",
  },
} as const satisfies Record<string, SettingCopy>;

export class SlidevSettingTab extends PluginSettingTab {
  plugin: SlidevPlugin;
  private readonly saveSettingsDebounced: Debouncer<[], void>;
  private unsubscribeSetup: (() => void) | null = null;

  constructor(app: App, plugin: SlidevPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.saveSettingsDebounced = debounce(() => {
      void plugin.saveSettings();
    }, 750);
  }

  override getSettingDefinitions(): Array<SettingDefinitionItem> {
    return [
      {
        ...settingCopy.quickSetup,
        visible: () =>
          shouldOfferQuickSetup(this.plugin.settings.slidevTemplateLocation),
        render: (setting) =>
          this.configureQuickSetupSetting(setting, () => {
            this.update();
          }),
      },
      {
        ...settingCopy.port,
        render: (setting) => {
          this.configurePortSetting(setting);
        },
      },
      {
        ...settingCopy.slidevProject,
        render: (setting) => {
          this.configureSlidevProjectSetting(setting);
        },
      },
      {
        ...settingCopy.nodeExecutable,
        render: (setting) => {
          this.configureNodeExecutableSetting(setting);
        },
      },
      {
        ...settingCopy.shouldRenderSlideNumberInMarkdownPreview,
        render: (setting) => {
          this.configureShouldRenderSlideNumberInMarkdownPreviewSetting(
            setting,
          );
        },
      },
      {
        ...settingCopy.debugMode,
        render: (setting) => {
          this.configureDebugModeSetting(setting);
        },
      },
    ];
  }

  override display(): void {
    this.unsubscribeSetup?.();
    this.unsubscribeSetup = null;
    this.containerEl.empty();
    if (shouldOfferQuickSetup(this.plugin.settings.slidevTemplateLocation)) {
      this.addQuickSetupSetting();
    }
    this.addPortSetting();
    this.addSlidevProjectSetting();
    this.addNodeExecutableSetting();
    this.addShouldRenderSlideNumberInMarkdownPreviewSetting();
    this.addDebugModeSetting();
  }

  override hide(): void {
    this.unsubscribeSetup?.();
    this.unsubscribeSetup = null;
    super.hide();
  }

  private addQuickSetupSetting() {
    const quickSetup = this.createSetting(settingCopy.quickSetup);
    this.unsubscribeSetup = this.configureQuickSetupSetting(quickSetup, () => {
      this.display();
    });
  }

  private configureQuickSetupSetting(
    quickSetup: Setting,
    refresh: () => void,
  ): () => void {
    const statusEl = quickSetup.infoEl.createDiv({
      cls: "slidev-setting-status",
    });
    let unsubscribe: (() => void) | null = null;

    quickSetup.addButton((button) => {
      button.setCta().onClick(() => {
        void this.plugin.setupController.start();
      });

      unsubscribe = this.plugin.setupController.subscribe((state) => {
        const control = getQuickSetupControl(state);
        button.setButtonText(control.label).setDisabled(control.disabled);
        statusEl.toggleClass(
          "slidev-setting-status--error",
          control.tone === "error",
        );
        statusEl.toggleClass(
          "slidev-setting-status--success",
          control.tone === "success",
        );
        statusEl.setText(control.message);

        if (
          control.status === "success" &&
          !shouldOfferQuickSetup(this.plugin.settings.slidevTemplateLocation)
        ) {
          window.activeWindow.setTimeout(() => {
            refresh();
          }, 0);
        }
      });
    });

    return () => {
      unsubscribe?.();
    };
  }

  private addPortSetting() {
    this.configurePortSetting(this.createSetting(settingCopy.port));
  }

  private configurePortSetting(setting: Setting) {
    setting.addText((text) =>
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
    this.configureDebugModeSetting(this.createSetting(settingCopy.debugMode));
  }

  private configureDebugModeSetting(setting: Setting) {
    setting.addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.isDebug).onChange(async (value) => {
        this.plugin.settings.isDebug = value;
        await this.plugin.saveSettings();
      }),
    );
  }

  private addShouldRenderSlideNumberInMarkdownPreviewSetting() {
    this.configureShouldRenderSlideNumberInMarkdownPreviewSetting(
      this.createSetting(settingCopy.shouldRenderSlideNumberInMarkdownPreview),
    );
  }

  private configureShouldRenderSlideNumberInMarkdownPreviewSetting(
    setting: Setting,
  ) {
    setting.addToggle((toggle) =>
      toggle
        .setValue(this.plugin.settings.shouldRenderSlideNumberInMarkdownPreview)
        .onChange(async (value) => {
          this.plugin.settings.shouldRenderSlideNumberInMarkdownPreview = value;
          await this.plugin.saveSettings();
        }),
    );
  }

  private addNodeExecutableSetting() {
    this.configureNodeExecutableSetting(
      this.createSetting(settingCopy.nodeExecutable),
    );
  }

  private configureNodeExecutableSetting(setting: Setting) {
    setting.addText((text) =>
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
    this.configureSlidevProjectSetting(
      this.createSetting(settingCopy.slidevProject),
    );
  }

  private configureSlidevProjectSetting(projectSetting: Setting) {
    projectSetting.addText((text) =>
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

  private createSetting({ desc, name }: SettingCopy) {
    return new Setting(this.containerEl).setName(name).setDesc(desc);
  }
}
