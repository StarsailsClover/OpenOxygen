/**
 * OpenOxygen — Route Resolution
 *
 * 消息路由：根据 channel/peer/account 解析到目标 agent + session。
 * 接口协议兼容 OpenClaw 的 resolve-route 规范。
 */
import { createSubsystemLogger } from "../../logging/index.js";
import { buildMainSessionKey, buildPeerSessionKey, DEFAULT_ACCOUNT_ID, DEFAULT_AGENT_ID, normalizeAgentId, } from "../sessions/index.js";
const log = createSubsystemLogger("routing");
channel ?  : ;
accountId ?  : ;
peerId ?  : ;
peerKind ?  : "user" | "group";
;
export function listBindings(config) {
    const bindings = [];
    for (const agent of config.agents.list) {
        // Each agent implicitly binds to all channels unless restricted
        bindings.push({ agentId, : .id });
    }
    return bindings;
}
channel;
accountId ?  | null : ;
peerId ?  | null : ;
peerKind ?  : "user" | "group";
;
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
                channelId,
                accountId,
                sessionKey,
                mainSessionKey(agentId) { },
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
                ? buildPeerSessionKey(agentId, channel, peerId)(agentId) : ;
            return {
                agentId,
                channelId,
                accountId,
                sessionKey,
                mainSessionKey(agentId) { },
                matchedBy: "binding.account",
            };
        }
    }
    // 3. Try channel-level binding match
    const channelMatch = findBindingMatch(config, { channel });
    if (channelMatch) {
        const agentId = normalizeAgentId(channelMatch.agentId);
        const sessionKey = peerId
            ? buildPeerSessionKey(agentId, channel, peerId)(agentId) : ;
        return {
            agentId,
            channelId,
            accountId,
            sessionKey,
            mainSessionKey(agentId) { },
            matchedBy: "binding.channel",
        };
    }
    // 4. Default default agent
    const defaultAgentId = config.agents.default
        ? normalizeAgentId(config.agents.default)
        :
    ;
    const sessionKey = peerId
        ? buildPeerSessionKey(defaultAgentId, channel, peerId)(defaultAgentId) : ;
    log.debug(`Route resolved to default agent: ${defaultAgentId}`);
    return {
        agentId,
        channelId,
        accountId,
        sessionKey,
        mainSessionKey(defaultAgentId) { },
        matchedBy: "default",
    };
}
// ─── Binding Matcher ────────────────────────────────────────────────────────
function findBindingMatch(config, criteria) { }
 | null;
{
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
