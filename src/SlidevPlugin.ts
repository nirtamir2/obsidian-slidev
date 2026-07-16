import { MarkdownView, Plugin, TFile, debounce } from "obsidian";
import {
  SLIDEV_SETTINGS_CHANGED_EVENT,
  SlideBoundaryRender,
} from "./SlideBoundaryRender";
import { SlidevSettingTab } from "./SlidevSettingTab";
import type { SlidevPluginSettings } from "./settings";
import { DEFAULT_SETTINGS, normalizeSettings } from "./settings";
import { SlidevSetupController } from "./setup/SlidevSetupController";
import { SlidevSetupService } from "./setup/SlidevSetupService";
import { parseSlideRanges } from "./slides/slideRanges";
import "./styles.css";
import { getVaultPath } from "./utils/getVaultPath";
import {
  SLIDEV_PRESENTATION_VIEW_TYPE,
  SlidevPresentationView,
} from "./views/SlidevPresentationView";
import { activateSlidevView } from "./views/activateSlidevView";

export class SlidevPlugin extends Plugin {
  override settings: SlidevPluginSettings = { ...DEFAULT_SETTINGS };
  setupController!: SlidevSetupController;

  override async onload() {
    await this.loadSettings();
    this.setupController = new SlidevSetupController({
      createInput: () => {
        const input = { vaultRoot: getVaultPath(this.app.vault) };
        return this.settings.nodeExecutable.length === 0
          ? input
          : { ...input, nodeExecutable: this.settings.nodeExecutable };
      },
      persistProjectPath: async (projectPath) => {
        const previousProjectPath = this.settings.slidevTemplateLocation;
        this.settings.slidevTemplateLocation = projectPath;
        try {
          await this.saveSettings();
        } catch (error) {
          this.settings.slidevTemplateLocation = previousProjectPath;
          throw error;
        }
      },
      service: new SlidevSetupService(),
    });

    this.addSettingTab(new SlidevSettingTab(this.app, this));

    this.registerView(
      SLIDEV_PRESENTATION_VIEW_TYPE,
      (leaf) => new SlidevPresentationView(leaf, this.settings),
    );

    this.registerSlideNumberPostProcessor();
    this.registerEvent(
      this.app.workspace.on("file-open", () => {
        this.updateOpenViewsSlide(1);
      }),
    );

    this.addRibbonIcon("presentation", "Open Slidev presentation view", () => {
      void this.activateView();
    }).addClass("slidev-plugin-ribbon-class");

    this.addCommand({
      id: "open-presentation-view",
      name: "Open presentation view",
      icon: "presentation",
      callback: () => {
        void this.activateView();
      },
    });

    this.registerDomEvent(window.activeDocument, "click", () => {
      this.navigateToCurrentSlide();
    });

    this.registerDomEvent(
      window.activeDocument,
      "keydown",
      debounce(() => {
        this.navigateToCurrentSlide();
      }, 100),
    );
  }

  override onunload() {
    void this.setupController.dispose();
  }

  private registerSlideNumberPostProcessor() {
    const slideRangesByFile = new WeakMap<
      TFile,
      {
        modifiedAt: number;
        ranges: Promise<ReturnType<typeof parseSlideRanges>>;
      }
    >();
    const loadSlideRanges = async (file: TFile) => {
      const source = await this.app.vault.cachedRead(file);
      return parseSlideRanges(source);
    };
    const getSlideRanges = async (file: TFile) => {
      const cached = slideRangesByFile.get(file);
      if (cached?.modifiedAt === file.stat.mtime) {
        return await cached.ranges;
      }

      const ranges = loadSlideRanges(file);
      slideRangesByFile.set(file, {
        modifiedAt: file.stat.mtime,
        ranges,
      });
      return await ranges;
    };

    this.registerMarkdownPostProcessor(async (element, context) => {
      if (!element.classList.contains("el-hr")) {
        return;
      }

      const section = context.getSectionInfo(element);
      const file = this.app.vault.getAbstractFileByPath(context.sourcePath);
      if (section == null || !(file instanceof TFile)) {
        return;
      }

      const resolvedSlideRanges = await getSlideRanges(file);
      const nextSlide = resolvedSlideRanges.find(
        (slide) =>
          slide.index > 0 &&
          (slide.start === section.lineStart ||
            slide.start === section.lineStart + 1),
      );
      if (nextSlide == null) {
        return;
      }

      context.addChild(
        new SlideBoundaryRender(element, {
          shouldRender: () =>
            this.settings.shouldRenderSlideNumberInMarkdownPreview,
          slideNumber: nextSlide.index + 1,
          workspace: this.app.workspace,
        }),
      );
    });
  }

  private navigateToCurrentSlide() {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (view?.file == null) {
      return;
    }

    const cursor = view.editor.getCursor();
    const slideRanges = parseSlideRanges(view.editor.getValue());
    const currentSlide = slideRanges.find(
      (slide) => slide.start <= cursor.line && slide.end >= cursor.line,
    );
    const slideIndex = currentSlide == null ? 1 : currentSlide.index + 1;

    this.updateOpenViewsSlide(slideIndex);
  }

  private updateOpenViewsSlide(slideNumber: number) {
    for (const leaf of this.app.workspace.getLeavesOfType(
      SLIDEV_PRESENTATION_VIEW_TYPE,
    )) {
      if (leaf.view instanceof SlidevPresentationView) {
        leaf.view.onChangeLine(slideNumber);
      }
    }
  }

  private async activateView() {
    await activateSlidevView(this.app.workspace, SLIDEV_PRESENTATION_VIEW_TYPE);
  }

  private async loadSettings() {
    this.settings = normalizeSettings(await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);

    for (const leaf of this.app.workspace.getLeavesOfType(
      SLIDEV_PRESENTATION_VIEW_TYPE,
    )) {
      if (leaf.view instanceof SlidevPresentationView) {
        leaf.view.updateSettings(this.settings);
      }
    }

    this.app.workspace.trigger(SLIDEV_SETTINGS_CHANGED_EVENT);
  }
}
