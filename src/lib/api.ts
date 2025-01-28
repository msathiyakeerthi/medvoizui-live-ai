// src/lib/api.ts
export async function storeApiResponse(userId: string, response: string, type: 'transcription' | 'medical_copilot') {
    try {
        const apiResponse = await fetch('https://largeinfra.com/api.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                response: response,
                type: type,
            }),
        });

        if (!apiResponse.ok) {
            throw new Error(`HTTP error! status: ${apiResponse.status}`);
        }

        const result = await apiResponse.json();
        console.log('API response stored successfully:', result);
        return result;
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error storing API response:', error.message);
            throw error;
        }
        throw new Error('An unknown error occurred.');
    }
}