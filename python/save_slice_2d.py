# -*- coding: utf-8 -*-
"""
✅ save_slice_2d.py
- NIfTI 파일(.nii)을 읽어서 지정된 축(Axis) 방향으로 2D PNG 이미지들을 저장합니다.
- 4D 데이터일 경우 '3번 채널'을 우선적으로 사용합니다.
"""

import argparse
import os
import json
import numpy as np
import nibabel as nib
from PIL import Image

def pick_volume(data: np.ndarray) -> np.ndarray:
    """
    3D 또는 4D 데이터에서 작업할 3D 볼륨을 추출합니다.
    4D인 경우 3번 채널(index 3)을 가져옵니다.
    """
    if data.ndim == 3:
        return data

    if data.ndim == 4:
        # 🔥 사용자 요청: 채널 3번 고정
        target_modality = 3

        # 만약 데이터가 3번 채널까지 없다면? (에러 방지용)
        if data.shape[3] <= target_modality:
            # 3번이 없으면 0번(기본)을 씁니다. (혹은 에러를 내려면 아래 주석 해제)
            # raise ValueError(f"Channel {target_modality} not found. Max is {data.shape[3]-1}")
            return data[:, :, :, 0]

        return data[:, :, :, target_modality]

    raise ValueError(f"Unsupported NIfTI dimension: {data.ndim}")

def normalize_slice(sl: np.ndarray) -> np.ndarray:
    """
    이미지 픽셀 값을 0~255 사이로 정규화(Normalize)합니다.
    상위 1%, 하위 1%를 잘라내어 명암비(Contrast)를 높입니다.
    """
    # NaN이나 무한대 값 제거
    sl = np.nan_to_num(sl, nan=0.0, posinf=0.0, neginf=0.0)

    # 명암비를 좋게 하기 위해 1%~99% 구간만 사용 (Outlier 제거)
    vmin = np.percentile(sl, 1)
    vmax = np.percentile(sl, 99)

    if vmax - vmin < 1e-6:
        # 이미지가 거의 단색인 경우 검은색으로
        return np.zeros(sl.shape, dtype=np.uint8)

    # 0~255 범위로 스케일링
    sl = np.clip(sl, vmin, vmax)
    norm = (sl - vmin) / (vmax - vmin) * 255.0
    return norm.astype(np.uint8)

def main():
    # 1. 인자 받기
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Path to .nii file")
    parser.add_argument("--out", required=True, help="Output directory") # 자바에서는 --out으로 보냄
    parser.add_argument("--axis", required=True, choices=['axial', 'coronal', 'sagittal'])
    args = parser.parse_args()

    # 2. 파일 로드
    if not os.path.exists(args.input):
        print(json.dumps({"ok": False, "message": "Input file not found"}))
        return

    nii = nib.load(args.input)
    data = nii.get_fdata()

    # 3. 3D 볼륨 선택 (3번 채널 로직 포함)
    try:
        vol = pick_volume(data)
    except Exception as e:
        print(json.dumps({"ok": False, "message": str(e)}))
        return

    # 4. 축(Axis)에 따라 자르기
    slices = []

    if args.axis == 'axial':     # Z축 기준
        cnt = vol.shape[2]
        for i in range(cnt):
            sl = vol[:, :, i]
            sl = np.rot90(sl) # 보기 좋게 90도 회전
            slices.append(sl)

    elif args.axis == 'coronal': # Y축 기준
        cnt = vol.shape[1]
        for i in range(cnt):
            sl = vol[:, i, :]
            sl = np.rot90(sl)
            slices.append(sl)

    elif args.axis == 'sagittal': # X축 기준
        cnt = vol.shape[0]
        for i in range(cnt):
            sl = vol[i, :, :]
            sl = np.rot90(sl)
            slices.append(sl)

    # 5. 이미지 저장
    os.makedirs(args.out, exist_ok=True)

    saved_count = 0
    for idx, sl_data in enumerate(slices):
        # 정규화 (0~255)
        img_data = normalize_slice(sl_data)

        # 이미지 저장 (Pillow 사용)
        img = Image.fromarray(img_data)

        # 파일명: slice_000.png, slice_001.png ...
        save_path = os.path.join(args.out, f"slice_{idx:03d}.png")
        img.save(save_path)
        saved_count += 1

    # 6. 결과 JSON 출력 (자바가 읽음)
    result = {
        "ok": True,
        "sliceCount": saved_count,
        "axis": args.axis,
        "outDir": args.out,
        "modality": 3 if data.ndim == 4 else 0 # 참고용 정보
    }
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()