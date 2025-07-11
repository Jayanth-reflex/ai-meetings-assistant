import React, { useEffect, useState } from "react"
import {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastVariant,
  ToastMessage
} from "../components/ui/toast"
import { preferencesManager, UserPreferences } from "../lib/preferences"

interface SettingsProps {
  setView: React.Dispatch<React.SetStateAction<'queue' | 'solutions' | 'debug' | 'settings'>>
}

// Add ErrorBoundary component
class SettingsErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }
  componentDidCatch(error: any, info: any) {
    console.error('[SettingsErrorBoundary] Error:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return <div style={{ color: 'red', padding: 20 }}>
        <b>Settings UI Error:</b> {String(this.state.error)}
      </div>
    }
    return this.props.children
  }
}

const Settings: React.FC<SettingsProps> = ({ setView }) => {
  const [apiKey, setApiKey] = useState("")
  const [status, setStatus] = useState<null | "success" | "error">(null)
  const [toastMessage, setToastMessage] = useState<ToastMessage>({
    title: "",
    description: "",
    variant: "neutral"
  })
  const [toastOpen, setToastOpen] = useState(false)
  
  // Color preferences state
  const [preferences, setPreferences] = useState<UserPreferences>(preferencesManager.getPreferences())
  const [model, setModel] = useState<string>("gemini-2.0-flash")

  useEffect(() => {
    if (window.electronAPI && typeof window.electronAPI.getGeminiApiKey === 'function') {
      window.electronAPI.getGeminiApiKey().then((key: string) => {
        setApiKey(key)
      })
    }
    
    // Debug logging for initial preferences
    // console.log('Settings initialized - Current preferences:', preferencesManager.getPreferences())
    // preferencesManager.debugPreferences() // Removed as per edit hint

    (async () => {
      try {
        if (window.electronAPI?.getGeminiModel) {
          const backendModel = await window.electronAPI.getGeminiModel()
          if (backendModel) {
            setModel(backendModel)
            console.log('[Settings] Loaded model from backend:', backendModel)
          } else {
            setModel('gemini-2.0-flash')
            console.warn('[Settings] Backend returned empty model, using fallback')
          }
        } else {
          setModel('gemini-2.0-flash')
          console.warn('[Settings] window.electronAPI.getGeminiModel not available, using fallback')
        }
      } catch (err) {
        setModel('gemini-2.0-flash')
        console.error('[Settings] Failed to fetch model from backend:', err)
      }
    })()
  }, [])

  const handleSave = async () => {
    try {
      if (window.electronAPI?.setGeminiModel) {
        await window.electronAPI.setGeminiModel(model)
        console.log('[Settings] Model changed to:', model)
      } else {
        console.warn('[Settings] window.electronAPI.setGeminiModel not available')
      }
      // Save color preferences
      preferencesManager.updatePreferences(preferences)
      
      // Debug logging
      console.log('Settings saved - Current preferences:', preferences)
      // preferencesManager.debugPreferences() // Removed as per edit hint
      
      setTimeout(() => {
        setView("queue")
      }, 1500)
    } catch (error) {
      setToastMessage({
        title: "Error",
        description: "Failed to save settings",
        variant: "error"
      })
      setToastOpen(true)
      console.error('[Settings] Failed to save model:', error)
    }
  }

  const handleResetColors = () => {
    preferencesManager.resetToDefaults()
    setPreferences(preferencesManager.getPreferences())
  }

  const updatePreference = (key: keyof UserPreferences, value: string | number) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div style={{
      padding: '15px',
      maxWidth: '350px',
      margin: '0 auto',
      backgroundColor: '#1a1a1a',
      border: '1px solid #333',
      borderRadius: '8px',
      color: 'white'
    }}>
      <Toast
        open={toastOpen}
        onOpenChange={setToastOpen}
        variant={toastMessage.variant}
        duration={3000}
      >
        <ToastTitle>{toastMessage.title}</ToastTitle>
        <ToastDescription>{toastMessage.description}</ToastDescription>
      </Toast>
      
      <div style={{ marginBottom: '15px', fontSize: '13px', fontWeight: 'bold' }}>
        Settings
      </div>

      {/* API Key Section */}
      <div style={{ marginBottom: '15px' }}>
        <div style={{ marginBottom: '8px', fontSize: '11px', color: '#ccc' }}>
          Gemini API Key
        </div>
        <input
          style={{
            width: '100%',
            padding: '7px',
            borderRadius: '4px',
            border: '1px solid #555',
            backgroundColor: '#2a2a2a',
            color: 'white',
            fontSize: '12px',
            marginBottom: '10px',
            outline: 'none',
            height: '28px',
            boxSizing: 'border-box'
          }}
          type="text"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="Enter your Gemini API key"
        />
      </div>

      {/* Model Selection Section */}
      <div style={{ marginBottom: '15px' }}>
        <div style={{ marginBottom: '8px', fontSize: '11px', color: '#ccc' }}>
          AI Model
        </div>
        <select
          style={{
            width: '100%',
            padding: '7px',
            borderRadius: '4px',
            border: '1px solid #555',
            backgroundColor: '#2a2a2a',
            color: 'white',
            fontSize: '12px',
            outline: 'none',
            height: '28px',
            boxSizing: 'border-box'
          }}
          value={model}
          onChange={e => setModel(e.target.value)}
        >
          <option value="models/gemini-2.0-flash">Gemini 2.0 Flash (Fast)</option>
          <option value="models/gemini-2.5-flash">Gemini 2.5 Flash (Faster, Newest)</option>
          <option value="models/gemini-2.5-pro">Gemini 2.5 Pro (Highest Quality, Newest)</option>
        </select>
      </div>
      <div style={{ marginBottom: '15px' }}>
        <div style={{ marginBottom: '8px', fontSize: '11px', color: '#ccc' }}>
          Response Colors
        </div>
        
        {/* Background Color */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '10px', color: '#aaa', marginBottom: '4px' }}>
            Background Color
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="color"
              value={preferences.responseBackgroundColor}
              onChange={(e) => updatePreference('responseBackgroundColor', e.target.value)}
              style={{
                width: '30px',
                height: '24px',
                border: '1px solid #555',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            />
            <input
              type="text"
              value={preferences.responseBackgroundColor}
              onChange={(e) => updatePreference('responseBackgroundColor', e.target.value)}
              style={{
                flex: 1,
                padding: '4px 6px',
                borderRadius: '3px',
                border: '1px solid #555',
                backgroundColor: '#2a2a2a',
                color: 'white',
                fontSize: '10px',
                outline: 'none'
              }}
              placeholder="#000000"
            />
          </div>
        </div>

        {/* Background Opacity */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '10px', color: '#aaa', marginBottom: '4px' }}>
            Background Opacity: {preferences.responseBackgroundOpacity}%
          </div>
          <input
            type="range"
            min="10"
            max="90"
            value={preferences.responseBackgroundOpacity}
            onChange={(e) => updatePreference('responseBackgroundOpacity', parseInt(e.target.value))}
            style={{
              width: '100%',
              height: '4px',
              borderRadius: '2px',
              background: '#555',
              outline: 'none',
              cursor: 'pointer'
            }}
          />
        </div>

        {/* Font Color */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '10px', color: '#aaa', marginBottom: '4px' }}>
            Font Color
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="color"
              value={preferences.responseFontColor}
              onChange={(e) => updatePreference('responseFontColor', e.target.value)}
              style={{
                width: '30px',
                height: '24px',
                border: '1px solid #555',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            />
            <input
              type="text"
              value={preferences.responseFontColor}
              onChange={(e) => updatePreference('responseFontColor', e.target.value)}
              style={{
                flex: 1,
                padding: '4px 6px',
                borderRadius: '3px',
                border: '1px solid #555',
                backgroundColor: '#2a2a2a',
                color: 'white',
                fontSize: '10px',
                outline: 'none'
              }}
              placeholder="#e5e7eb"
            />
          </div>
        </div>

        {/* Reset Colors Button */}
        <button
          style={{
            padding: '4px 8px',
            borderRadius: '3px',
            border: 'none',
            backgroundColor: '#666',
            color: 'white',
            cursor: 'pointer',
            fontSize: '10px',
            height: '24px',
            width: '100%',
            marginTop: '8px'
          }}
          onClick={handleResetColors}
        >
          Reset Colors
        </button>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
        <button
          style={{
            padding: '4px 8px',
            borderRadius: '3px',
            border: 'none',
            backgroundColor: '#555',
            color: 'white',
            cursor: 'pointer',
            fontSize: '10px',
            height: '24px',
            minWidth: '50px'
          }}
          onClick={() => setView("queue")}
        >
          Back
        </button>
        <button
          style={{
            padding: '4px 8px',
            borderRadius: '3px',
            border: 'none',
            backgroundColor: apiKey.trim() ? '#007acc' : '#555',
            color: 'white',
            cursor: apiKey.trim() ? 'pointer' : 'not-allowed',
            fontSize: '10px',
            height: '24px',
            minWidth: '40px'
          }}
          onClick={handleSave}
          disabled={!apiKey.trim()}
        >
          Save
        </button>
      </div>
    </div>
  )
}

export default function SettingsWithBoundary(props: SettingsProps) {
  return <SettingsErrorBoundary>
    <Settings {...props} />
  </SettingsErrorBoundary>
} 