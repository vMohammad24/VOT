import axios from "axios";

export async function uploadFile(fileURL: string) {
    const file = await (await fetch(fileURL)).blob();
    const formData = new FormData();
    formData.set("files", file)
    return axios.post(`https://nest.rip/api/files/upload`, formData, {
        headers: {
            "Authorization": process.env.NEST_API_KEY,
        }
    }).then(value => value.data)
}

export async function shortenUrl(url: string, password?: string) {
    return (await axios.put(`https://nest.rip/api/shorts`, {
        url,
        password,
        urlType: "Normal",
        length: 5,
        domain: "cdn.vmohammad.wiki",
        subDomain: "",
        EmbedType: "Target"
    }, {
        headers: {
            "Authorization": process.env.NEST_API_KEY!
        },
    }).then(value => value.data.url));
}