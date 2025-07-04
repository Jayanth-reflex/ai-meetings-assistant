/**
 * @file main.ts
 * @description
 *   Main entry point for the AI Meetings Assistant Electron application. Initializes application state, window, screenshot, processing, and shortcut helpers. Registers IPC handlers and manages application lifecycle events.
 *
 * Architecture Role:
 *   - Bootstraps the Electron app and all core services.
 *   - Manages global state, window, screenshot, and processing helpers.
 *   - Handles Electron app lifecycle, session, and IPC event registration.
 *
 * Usage:
 *   Run as the Electron main process entry point. Instantiates AppState and all core helpers.
 *
 * @author UAT
 * @copyright MIT
 */
import { app, BrowserWindow, ipcMain } from "electron"
import { initializeIpcHandlers } from "./ipcHandlers"
import { WindowHelper } from "./WindowHelper"
import { ScreenshotHelper } from "./ScreenshotHelper"
import { ShortcutsHelper } from "./shortcuts"
import { ProcessingHelper } from "./ProcessingHelper"
import { HotkeyListener } from './services/HotkeyListener'
import fs from 'fs'
import path from 'path'

export class AppState {
  private static instance: AppState | null = null

  private windowHelper: WindowHelper
  private screenshotHelper: ScreenshotHelper
  public shortcutsHelper: ShortcutsHelper
  public processingHelper: ProcessingHelper

  // View management
  private view: "queue" | "solutions" = "queue"

  private problemInfo: {
    problem_statement: string
    input_format: Record<string, any>
    output_format: Record<string, any>
    constraints: Array<Record<string, any>>
    test_cases: Array<Record<string, any>>
  } | null = null // Allow null

  private hasDebugged: boolean = false

  // Processing events
  public readonly PROCESSING_EVENTS = {
    //global states
    UNAUTHORIZED: "procesing-unauthorized",
    NO_SCREENSHOTS: "processing-no-screenshots",

    //states for generating the initial solution
    INITIAL_START: "initial-start",
    PROBLEM_EXTRACTED: "problem-extracted",
    SOLUTION_SUCCESS: "solution-success",
    INITIAL_SOLUTION_ERROR: "solution-error",

    //states for processing the debugging
    DEBUG_START: "debug-start",
    DEBUG_SUCCESS: "debug-success",
    DEBUG_ERROR: "debug-error"
  } as const

  constructor() {
    // Initialize WindowHelper with this
    this.windowHelper = new WindowHelper(this)

    // Initialize ScreenshotHelper
    this.screenshotHelper = new ScreenshotHelper(this.view)

    // Initialize ProcessingHelper
    this.processingHelper = new ProcessingHelper(this)

    // Initialize ShortcutsHelper
    this.shortcutsHelper = new ShortcutsHelper(this)
  }

  public static getInstance(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState()
    }
    return AppState.instance
  }

  // Getters and Setters
  public getMainWindow(): BrowserWindow | null {
    return this.windowHelper.getMainWindow()
  }

  public getView(): "queue" | "solutions" {
    return this.view
  }

  public setView(view: "queue" | "solutions"): void {
    this.view = view
    this.screenshotHelper.setView(view)
  }

  public isVisible(): boolean {
    return this.windowHelper.isVisible()
  }

  public getScreenshotHelper(): ScreenshotHelper {
    return this.screenshotHelper
  }

  public getProblemInfo(): any {
    return this.problemInfo
  }

  public setProblemInfo(problemInfo: any): void {
    this.problemInfo = problemInfo
  }

  public getScreenshotQueue(): string[] {
    return this.screenshotHelper.getScreenshotQueue()
  }

  public getExtraScreenshotQueue(): string[] {
    return this.screenshotHelper.getExtraScreenshotQueue()
  }

  // Window management methods
  public createWindow(): void {
    this.windowHelper.createWindow()
  }

  public hideMainWindow(): void {
    this.windowHelper.hideMainWindow()
  }

  public showMainWindow(): void {
    this.windowHelper.showMainWindow()
  }

  public toggleMainWindow(): void {
    console.log(
      "Screenshots: ",
      this.screenshotHelper.getScreenshotQueue().length,
      "Extra screenshots: ",
      this.screenshotHelper.getExtraScreenshotQueue().length
    )
    this.windowHelper.toggleMainWindow()
  }

  public setWindowDimensions(width: number, height: number): void {
    this.windowHelper.setWindowDimensions(width, height)
  }

  public clearQueues(): void {
    this.screenshotHelper.clearQueues()

    // Clear problem info
    this.problemInfo = null

    // Reset view to initial state
    this.setView("queue")
  }

  // Screenshot management methods
  public async takeScreenshot(): Promise<string> {
    if (!this.getMainWindow()) throw new Error("No main window available")

    const screenshotPath = await this.screenshotHelper.takeScreenshot(
      () => this.hideMainWindow(),
      () => this.showMainWindow()
    )

    return screenshotPath
  }

  public async getImagePreview(filepath: string): Promise<string> {
    return this.screenshotHelper.getImagePreview(filepath)
  }

  public async deleteScreenshot(
    path: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.screenshotHelper.deleteScreenshot(path)
  }

  public addFileToQueue(filePath: string): void {
    this.screenshotHelper.addFileToQueue(filePath)
  }

  // New methods to move the window
  public moveWindowLeft(): void {
    this.windowHelper.moveWindowLeft()
  }

  public moveWindowRight(): void {
    this.windowHelper.moveWindowRight()
  }
  public moveWindowDown(): void {
    this.windowHelper.moveWindowDown()
  }
  public moveWindowUp(): void {
    this.windowHelper.moveWindowUp()
  }

  public setHasDebugged(value: boolean): void {
    this.hasDebugged = value
  }

  public getHasDebugged(): boolean {
    return this.hasDebugged
  }
}

// Application initialization
async function initializeApp() {
  const appState = AppState.getInstance()

  // Initialize IPC handlers before window creation
  initializeIpcHandlers(appState)

  app.whenReady().then(() => {
    console.log("App is ready")
    appState.createWindow()
    // Register global shortcuts using ShortcutsHelper
    appState.shortcutsHelper.registerGlobalShortcuts()
    const mainWindow = appState.getMainWindow()
    if (mainWindow) {
      HotkeyListener.registerShortcuts(mainWindow)
    }
  })

  app.on("activate", () => {
    console.log("App activated")
    if (appState.getMainWindow() === null) {
      appState.createWindow()
    }
  })

  // Quit when all windows are closed, except on macOS
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit()
    }
  })

  app.dock?.hide() // Hide dock icon (optional)
  app.commandLine.appendSwitch("disable-background-timer-throttling")

  // Path to the user's Documents/AI-Interview-Assistant directory
  const getSessionsRoot = () => path.join(app.getPath('documents'), 'AI-Interview-Assistant')

  // Save a temp file (for resume upload)
  ipcMain.handle('save-temp-file', async (_event, fileName: string, buffer: Buffer) => {
    console.log("save-temp-file called with fileName:", fileName, "buffer length:", buffer.length)
    const tempDir = path.join(app.getPath('temp'), 'ai-interview-assistant')
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })
    const tempPath = path.join(tempDir, `${Date.now()}_${fileName}`)
    fs.writeFileSync(tempPath, buffer)
    console.log("File saved to temp path:", tempPath)
    return tempPath
  })

  // Get current session path (for follow-up, etc.)
  let currentSessionPath: string | null = null
  ipcMain.handle('get-current-session-path', async () => {
    // For demo, just return the latest session folder
    const sessionsRoot = getSessionsRoot()
    if (!fs.existsSync(sessionsRoot)) return ''
    const sessions = fs.readdirSync(sessionsRoot).filter(f => fs.statSync(path.join(sessionsRoot, f)).isDirectory())
    if (sessions.length === 0) return ''
    // Sort by folder creation time, descending
    const latest = sessions.map(f => ({
      name: f,
      time: fs.statSync(path.join(sessionsRoot, f)).ctimeMs
    })).sort((a, b) => b.time - a.time)[0]
    currentSessionPath = path.join(sessionsRoot, latest.name)
    return currentSessionPath
  })

  // List all session folders
  ipcMain.handle('list-sessions', async () => {
    const sessionsRoot = getSessionsRoot()
    if (!fs.existsSync(sessionsRoot)) return []
    return fs.readdirSync(sessionsRoot).filter(f => fs.statSync(path.join(sessionsRoot, f)).isDirectory())
  })
}

// Start the application
initializeApp().catch(console.error)
