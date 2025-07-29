import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)
  const [isWebView, setIsWebView] = React.useState<boolean>(false)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    
    // Detect WebView environment
    const detectWebView = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const isInWebView = (
        userAgent.includes('wv') || // Android WebView
        userAgent.includes('webview') || // iOS WebView
        userAgent.includes('react-native') || // React Native WebView
        (window as any).ReactNativeWebView !== undefined // React Native WebView bridge
      )
      setIsWebView(isInWebView)
      console.log('[DEBUG] WebView detection:', { userAgent, isInWebView })
    }
    
    detectWebView()
    
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return { isMobile: !!isMobile, isWebView }
}

// Legacy export for backward compatibility
export function useIsMobileLegacy() {
  const { isMobile } = useIsMobile()
  return isMobile
}
