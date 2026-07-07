import { qs } from '@/lib/dom';
import {
    getFileInput,
    getFileReader,
    setText,
} from '../dom-effects';
import { getImageDataFromReader } from '../image-data';

const MAX_IMAGE_BYTES = 7 * 1024 * 1024;

export function bindImageUploadHandlers(): void {
    qs('.upload-image-delegator')?.addEventListener('click', function () { qs('#upload-image')?.click(); });
    qs('.upload-image-deletor')?.addEventListener('click', async function () {
        await chrome.storage.local.set({ autoInsertImageData: {} });
        setText('.image-name', '설정된 이미지 파일이 없습니다');
    });

    qs('#upload-image')?.addEventListener('change', function (event) {
        const input = getFileInput(event);
        const file = input?.files?.[0];
        if (!file) return;
        if (file.size > MAX_IMAGE_BYTES) {
            alert('이미지 용량이 너무 큽니다. 7MB 이하 파일을 사용해주세요.');
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = async function(event: ProgressEvent<FileReader>) {
            const fileReader = getFileReader(event);
            const imageData = fileReader ? getImageDataFromReader(fileReader, file) : null;
            if (!imageData) {
                alert('이미지를 불러오지 못했습니다.');
                return;
            }
            try {
                await chrome.storage.local.set({ autoInsertImageData: imageData });
                setText('.image-name', file.name);
            } catch (e) {
                console.error(e);
                alert('이미지를 저장하지 못했습니다. 파일 용량을 줄여 다시 시도해주세요.');
            }
        };
        reader.readAsDataURL(file);
    });
}
