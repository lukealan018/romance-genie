import { supabase } from "@/integrations/supabase/client";

/**
 * Safely invoke a Supabase edge function with proper error handling.
 * Prevents "Right side of assignment cannot be destructured" errors
 * when invoke returns undefined due to network issues or timeouts.
 */
export async function safeInvoke<T = any>(
  functionName: string,
  options?: { body?: any; headers?: Record<string, string> }
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const response = await supabase.functions.invoke(functionName, options);
    
    // Handle case where response is undefined/null
    if (!response) {
      return { data: null, error: new Error('No response from edge function') };
    }
    
    return {
      data: response.data ?? null,
      error: response.error ?? null
    };
  } catch (err) {
    console.error(`Error invoking ${functionName}:`, err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error invoking edge function')
    };
  }
}
