import { Pokemon, StatusOperation } from "@/types/types"

/**
 * Compares two Pokemon states (before and after user edit)
 * and generates a strictly ordered array of StatusOperations
 * that represents the transition.
 */
export function computeStatusOperations(oldPokemon: Pokemon, newPokemon: Pokemon): StatusOperation[] {
    const operations: StatusOperation[] = []

    const oldStatus = oldPokemon.status || null
    const newStatus = newPokemon.status || null

    // 1. MAJORS STATUS (burn, poison, badly-poison, freeze, para, sleep)
    if (oldStatus !== newStatus) {
        if (oldStatus !== null) {
            operations.push({ type: "REMOVE", status: oldStatus })
        }
        if (newStatus !== null) {
            operations.push({ type: "ADD", status: newStatus })
        }
    }

    const oldConf = !!oldPokemon.confusion
    const newConf = !!newPokemon.confusion
    // 2. CONFUSION
    if (oldConf !== newConf) {
        if (newConf) {
            operations.push({ type: "ADD", status: "confusion" })
        } else {
            operations.push({ type: "REMOVE", status: "confusion" })
        }
    }

    const oldLove = !!oldPokemon.love
    const newLove = !!newPokemon.love
    // 3. LOVE
    if (oldLove !== newLove) {
        if (newLove) {
            operations.push({ type: "ADD", status: "love" })
        } else {
            operations.push({ type: "REMOVE", status: "love" })
        }
    }

    const oldShowSleep = !!oldPokemon.showSleepCounter
    const newShowSleep = !!newPokemon.showSleepCounter
    // 4. SLEEP COUNTER TOGGLE
    if (oldShowSleep !== newShowSleep) {
         operations.push({ type: "COUNTER_TOGGLE", status: "sleep", show: newShowSleep })
    }

    const oldShowConf = !!oldPokemon.showConfusionCounter
    const newShowConf = !!newPokemon.showConfusionCounter
    // 5. CONFUSION COUNTER TOGGLE
    if (oldShowConf !== newShowConf) {
         operations.push({ type: "COUNTER_TOGGLE", status: "confusion", show: newShowConf })
    }

    // 6. SLEEP COUNTER VALUE (relative diff)
    const oldSleepVal = oldPokemon.sleepCounter ?? 0
    const newSleepVal = newPokemon.sleepCounter ?? 0
    if (oldSleepVal !== newSleepVal) {
        const diff = newSleepVal - oldSleepVal
        if (diff !== 0) {
            operations.push({ type: "COUNTER_RELATIVE", status: "sleep", amount: diff })
        }
    }

    // 7. CONFUSION COUNTER VALUE (relative diff)
    const oldConfVal = oldPokemon.confusionCounter ?? 0
    const newConfVal = newPokemon.confusionCounter ?? 0
    if (oldConfVal !== newConfVal) {
        const diff = newConfVal - oldConfVal
        if (diff !== 0) {
            operations.push({ type: "COUNTER_RELATIVE", status: "confusion", amount: diff })
        }
    }

    return operations
}
