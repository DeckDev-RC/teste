/**
 * Helper para fazer requisições autenticadas ao backend
 * Inclui automaticamente o token JWT do Supabase
 */

import { supabase } from '../supabaseClient'

/**
 * Faz uma requisição fetch com autenticação automática
 * @param {string} url - URL da requisição
 * @param {RequestInit} options - Opções do fetch (method, body, headers, etc)
 * @returns {Promise<Response>}
 */
export async function authenticatedFetch(url, options = {}) {
    // Obter token JWT do Supabase
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    // Preparar headers
    const headers = {
        ...options.headers,
    }

    // Adicionar token de autenticação se disponível
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    // Fazer requisição com headers atualizados
    return fetch(url, {
        ...options,
        headers,
    })
}

/**
 * Faz uma requisição JSON autenticada
 * @param {string} url - URL da requisição
 * @param {RequestInit} options - Opções do fetch
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function authenticatedJsonFetch(url, options = {}) {
    const response = await authenticatedFetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    })

    const data = await response.json()
    return data
}
