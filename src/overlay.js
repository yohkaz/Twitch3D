import * as SCENE from './scene.js';

document.querySelector('#button-add').addEventListener('click', () => {
    SCENE.addStream(document.getElementById('input-name').value);
    document.getElementById('input-name').value = "";
});

document.querySelector('#input-name').addEventListener('keyup', ({key}) => {
    if (key === "Enter") {
        SCENE.addStream(document.getElementById('input-name').value);
        document.getElementById('input-name').value = "";
    }
});

document.querySelector('#button-remove').addEventListener('click', () => {
    SCENE.removeStream();
});

document.querySelector('#arrow-right').addEventListener('click', () => { SCENE.nextStream(); });
document.querySelector('#arrow-left').addEventListener('click', () => { SCENE.prevStream(); });
document.querySelector('#small-arrow-right').addEventListener('click', () => { SCENE.halfNextStream(); });
document.querySelector('#small-arrow-left').addEventListener('click', () => { SCENE.halfPrevStream(); });