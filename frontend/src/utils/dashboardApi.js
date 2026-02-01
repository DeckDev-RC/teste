/**
 * Funções de API para consumir endpoints do dashboard master
 */

import { authenticatedFetch } from './api.js';

const API_BASE = '/api/dashboard';

/**
 * Busca estatísticas gerais do dashboard
 * @param {Object} filters - Filtros opcionais
 * @param {string} filters.startDate - Data início (ISO string)
 * @param {string} filters.endDate - Data fim (ISO string)
 * @param {string} filters.groupBy - Agrupamento (day/week/month)
 * @returns {Promise<Object>} Estatísticas gerais
 */
export async function getDashboardStats(filters = {}) {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.groupBy) params.append('groupBy', filters.groupBy);

    const url = `${API_BASE}/stats${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await authenticatedFetch(url);
    return await response.json();
}

/**
 * Busca estatísticas de usuários
 * @param {Object} filters - Filtros opcionais
 * @returns {Promise<Object>} Estatísticas de usuários
 */
export async function getUsersStats(filters = {}) {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const url = `${API_BASE}/users${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await authenticatedFetch(url);
    return await response.json();
}

/**
 * Busca estatísticas de créditos
 * @param {Object} filters - Filtros opcionais
 * @returns {Promise<Object>} Estatísticas de créditos
 */
export async function getCreditsStats(filters = {}) {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const url = `${API_BASE}/credits${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await authenticatedFetch(url);
    return await response.json();
}

/**
 * Busca estatísticas de uso
 * @param {Object} filters - Filtros opcionais
 * @returns {Promise<Object>} Estatísticas de uso
 */
export async function getUsageStats(filters = {}) {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.groupBy) params.append('groupBy', filters.groupBy);

    const url = `${API_BASE}/usage${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await authenticatedFetch(url);
    return await response.json();
}

/**
 * Busca estatísticas de performance
 * @param {Object} filters - Filtros opcionais
 * @returns {Promise<Object>} Estatísticas de performance
 */
export async function getPerformanceStats(filters = {}) {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const url = `${API_BASE}/performance${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await authenticatedFetch(url);
    return await response.json();
}

/**
 * Busca estatísticas financeiras
 * @param {Object} filters - Filtros opcionais
 * @returns {Promise<Object>} Estatísticas financeiras
 */
export async function getFinancialStats(filters = {}) {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const url = `${API_BASE}/financial${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await authenticatedFetch(url);
    return await response.json();
}

/**
 * Busca top N usuários por uso/créditos
 * @param {number} limit - Número de usuários (padrão: 10)
 * @param {Object} filters - Filtros opcionais
 * @returns {Promise<Object>} Top usuários
 */
export async function getTopUsers(limit = 10, filters = {}) {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const url = `${API_BASE}/top-users?${params.toString()}`;
    const response = await authenticatedFetch(url);
    return await response.json();
}

/**
 * Busca dados temporais para gráficos
 * @param {Object} filters - Filtros opcionais
 * @returns {Promise<Object>} Dados temporais
 */
export async function getTimeSeriesData(filters = {}) {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.groupBy) params.append('groupBy', filters.groupBy || 'day');

    const url = `${API_BASE}/timeseries${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await authenticatedFetch(url);
    return await response.json();
}

/**
 * Busca estatísticas detalhadas de usuário x IA
 * @param {Object} filters - Filtros opcionais
 * @returns {Promise<Object>} Estatísticas usuário x IA
 */
export async function getUserIAStats(filters = {}) {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const url = `${API_BASE}/user-ia${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await authenticatedFetch(url);
    return await response.json();
}

/**
 * Busca análises recentes
 * @param {Object} filters - Filtros opcionais
 * @returns {Promise<Object>} Análises recentes
 */
export async function getRecentAnalyses(filters = {}) {
    const params = new URLSearchParams();
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.analysisType) params.append('analysisType', filters.analysisType);
    if (filters.provider) params.append('provider', filters.provider);
    if (filters.success !== undefined) params.append('success', filters.success.toString());

    const url = `${API_BASE}/recent-analyses${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await authenticatedFetch(url);
    return await response.json();
}

/**
 * Atualiza as empresas permitidas para um usuário
 * @param {string} userId - ID do usuário
 * @param {Array<string>} companies - Array de slugs de empresas
 * @returns {Promise<Object>} Resultado da operação
 */
export async function updateUserCompanies(userId, companies) {
    const url = `/api/admin/users/${userId}/companies`;
    const response = await authenticatedFetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ allowedCompanies: companies })
    });
    return await response.json();
}

/**
 * Busca todas as empresas cadastradas no catálogo
 */
export async function getAdminCompanies() {
    const url = `/api/admin/companies`;
    const response = await authenticatedFetch(url);
    return await response.json();
}

/**
 * Cria uma nova empresa no catálogo
 */
export async function createAdminCompany(companyData) {
    const url = `/api/admin/companies`;
    const response = await authenticatedFetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(companyData)
    });
    return await response.json();
}

/**
 * Atualiza uma empresa existente
 */
export async function updateAdminCompany(id, companyData) {
    const url = `/api/admin/companies/${id}`;
    const response = await authenticatedFetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(companyData)
    });
    return await response.json();
}

/**
 * Remove uma empresa do catálogo
 */
export async function deleteAdminCompany(id) {
    const url = `/api/admin/companies/${id}`;
    const response = await authenticatedFetch(url, {
        method: 'DELETE'
    });
    return await response.json();
}

/**
 * Busca todos os padrões de renomeação
 */
export async function getNamingPatterns() {
    const url = `/api/admin/naming-patterns`;
    const response = await authenticatedFetch(url);
    return await response.json();
}

/**
 * Cria um novo padrão de renomeação
 */
export async function createNamingPattern(patternData) {
    const url = `/api/admin/naming-patterns`;
    const response = await authenticatedFetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(patternData)
    });
    return await response.json();
}

/**
 * Atualiza um padrão de renomeação
 */
export async function updateNamingPattern(id, patternData) {
    const url = `/api/admin/naming-patterns/${id}`;
    const response = await authenticatedFetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(patternData)
    });
    return await response.json();
}

/**
 * Remove um padrão de renomeação
 */
export async function deleteNamingPattern(id) {
    const url = `/api/admin/naming-patterns/${id}`;
    const response = await authenticatedFetch(url, {
        method: 'DELETE'
    });
    return await response.json();
}
