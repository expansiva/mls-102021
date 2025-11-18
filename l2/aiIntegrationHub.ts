/// <mls shortName="aiIntegrationHub" project="102021" enhancement="_blank" />

import { createThread } from "./_100554_collabMessageHelper";
import { getThreadByName } from './_100554_msgDBController';
import { addMessage } from './_100554_collabMessageHelper'

export async function addOrUpdateEndPoint(action: string, intent: string, interfaceRequest: string, interfaceResponse: string, mock: string | undefined) {

    let thread = await getThreadByName('agentEndPoint');
    if (!thread) {
        thread = await createThread('agentEndPoint', [], 'company');
    }

    if (!thread) throw new Error('[aiIntegrationHub]: Not found thread');

    const prompt = JSON.stringify({
        name: action,
        intent: intent,
        responseInterfaces: interfaceRequest,
        requestInterfaces: interfaceResponse,

    });

    await addMessage(thread.threadId, prompt);

}