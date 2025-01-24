export async function transcriptionApi(data: any) {
	console.log("Preparing to send API request with data:", data);

	try {
		const response = await fetch("https://starzflow.onrender.com/api/v1/prediction/545ce52b-d9d2-493c-b53b-53748edd9d18", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const result = await response.json();
		console.log("API response received:", result);
		return result;
	} catch (error: unknown) {
		if (error instanceof Error) {
			console.error("Error during fetch request:", error.message);
			throw error;
		}
		throw new Error("An unknown error occurred.");
	}
}
