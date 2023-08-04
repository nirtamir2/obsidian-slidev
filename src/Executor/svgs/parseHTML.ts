export default function parseHTML(html: string) {
    const container = document.createElement("div");
    container.innerHTML = html;
    return container.firstElementChild;
}
