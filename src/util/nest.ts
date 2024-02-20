import axios from "axios";

const apiKey = process.env.NEST_API_KEY!;
export async function uploadFile(content: Bun.BlobPart[]) {
    const file = new Blob(content, { type: 'text/plain' });
    const formData = new FormData();
    formData.append('files', file);
    return (await axios.post(`https://nest.rip/api/files/upload`, formData, {
        headers: {
            "Authorization": apiKey,
            "Content-Type": "text/plain",
        }
    }).then(value => value.data as any));
}