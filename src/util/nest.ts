import axios from "axios";

export async function uploadFile(file: any) {
    const formData = new FormData();
    formData.set("files", file)
    const res = await axios.post(`https://nest.rip/api/files/upload`, formData, {
        headers: {
            "Authorization": import.meta.env.NEST_API_KEY,
        }
    })
    return res.data
}

export async function shortenUrl(url: string, password?: string) {
    return (await axios.put(`https://nest.rip/api/shorts`, {
        url,
        password,
        urlType: "Normal",
        length: 5,
        domain: import.meta.env.NEST_SHORTS_DOMAIN,
        subDomain: "",
        EmbedType: "Target"
    }, {
        headers: {
            "Authorization": import.meta.env.NEST_API_KEY!
        },
    }).then(value => value.data.url));
}