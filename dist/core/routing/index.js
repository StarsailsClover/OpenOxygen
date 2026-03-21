/**
 * OpenOxygen — Route Resolution
 *
 * 消息路由：根据 channel/peer/account 解析到目标 agent + session。
 * 接口协议兼容 OpenClaw 的 resolve-route 规范。
 */
import { createSubsystemLogger } from "../../logging/index.js";
import { buildMainSessionKey, buildPeerSessionKey, DEFAULT_ACCOUNT_ID, DEFAULT_AGENT_ID, normalizeAgentId, } from "../sessions/index.js";
const log = createSubsystemLogger("routing");
export function listBindings(config) {
    const bindings = [];
    for (const agent of config.agents.list) {
        // Each agent implicitly binds to all channels unless restricted
        bindings.push({ agentId: agent.id });
    }
    return bindings;
}
// ─── Route Resolution ───────────────────────────────────────────────────────
export function resolveRoute(input) {
    const { config, channel, accountId, peerId, peerKind } = input;
    const normalizedAccount = accountId ?? DEFAULT_ACCOUNT_ID;
    // 1. Try peer-level binding match
    if (peerId) {
        const peerMatch = findBindingMatch(config, { channel, peerId, peerKind });
        if (peerMatch) {
            const agentId = normalizeAgentId(peerMatch.agentId);
            const sessionKey = buildPeerSessionKey(agentId, channel, peerId);
            return {
                agentId,
                channelId: channel,
                accountId: normalizedAccount,
                sessionKey,
                mainSessionKey: buildMainSessionKey(agentId),
                matchedBy: "binding.peer",
            };
        }
    }
    // 2. Try account-level binding match
    if (accountId) {
        const accountMatch = findBindingMatch(config, { channel, accountId });
        if (accountMatch) {
            const agentId = normalizeAgentId(accountMatch.agentId);
            const sessionKey = peerId
                ? buildPeerSessionKey(agentId, channel, peerId)
                : buildMainSessionKey(agentId);
            return {
                agentId,
                channelId: channel,
                accountId: normalizedAccount,
                sessionKey,
                mainSessionKey: buildMainSessionKey(agentId),
                matchedBy: "binding.account",
            };
        }
    }
    // 3. Try channel-level binding match
    const channelMatch = findBindingMatch(config, { channel });
    if (channelMatch) {
        const agentId = normalizeAgentId(channelMatch.agentId);
        const sessionKey = peerId
            ? buildPeerSessionKey(agentId, channel, peerId)
            : buildMainSessionKey(agentId);
        return {
            agentId,
            channelId: channel,
            accountId: normalizedAccount,
            sessionKey,
            mainSessionKey: buildMainSessionKey(agentId),
            matchedBy: "binding.channel",
        };
    }
    // 4. Default: use default agent
    const defaultAgentId = config.agents.default
        ? normalizeAgentId(config.agents.default)
        : DEFAULT_AGENT_ID;
    const sessionKey = peerId
        ? buildPeerSessionKey(defaultAgentId, channel, peerId)
        : buildMainSessionKey(defaultAgentId);
    log.debug(`Route resolved to default agent: ${defaultAgentId}`);
    return {
        agentId: defaultAgentId,
        channelId: channel,
        accountId: normalizedAccount,
        sessionKey,
        mainSessionKey: buildMainSessionKey(defaultAgentId),
        matchedBy: "default",
    };
}
// ─── Binding Matcher ────────────────────────────────────────────────────────
function findBindingMatch(config, criteria) {
    const bindings = listBindings(config);
    for (const binding of bindings) {
        if (criteria.peerId && binding.peerId === criteria.peerId) {
            if (!binding.channel || binding.channel === criteria.channel) {
                return binding;
            }
        }
        if (criteria.accountId && binding.accountId === criteria.accountId) {
            if (!binding.channel || binding.channel === criteria.channel) {
                return binding;
            }
        }
        if (criteria.channel && binding.channel === criteria.channel && !binding.peerId && !binding.accountId) {
            return binding;
        }
    }
    return null;
}
//# sourceMappingURL=index.js.map