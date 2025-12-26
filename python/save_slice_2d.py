# -*- coding: utf-8 -*-
"""
✅ save_slice_2d.py
- NIfTI 파일(.nii)을 읽어서 지정된 축(Axis) 방향으로 2D PNG 이미지들을 저장합니다.
- 4D 데이터일 경우 '3번 채널'을 우선적으로 사용합니다.

argparse로 input/out/axis 받기
↓
input 파일 존재 확인
↓
nibabel로 NII 로드 → numpy 배열 얻기
↓
4D면 channel 3(없으면 0) 선택해서 3D로 만들기
↓
axis에 따라 2D 슬라이스 리스트 만들기
↓
각 슬라이스를 0~255로 정규화
↓
slice_000.png 형태로 out 폴더에 저장
↓
마지막에 {"ok":true,"sliceCount":...} JSON을 print
"""
# 12월 23일 마지막
import argparse
import os
import json
import numpy as np
import nibabel as nib
from PIL import Image

def pick_volume(data: np.ndarray) -> np.ndarray:
    """
    data: np.ndarray
    → “data는 numpy 배열일 거야(라고 힌트 주는 것)”
    -> np.ndarray
    → “이 함수는 numpy 배열을 반환할 거야”
    """
    # data.nmim = numpy 배열의 차원 수
    if data.ndim == 3:
        return data

    if data.ndim == 4:
        # 🔥 target_modality = 3 --> 3번채널을 쓰겠다 (0부터 시작)
        target_modality = 3

        # 만약 데이터가 3번 채널까지 없다면? (에러 방지용)
        # data.shape[3] 배열의 각 차원 크기 정보
        if data.shape[3] <= target_modality:
            # 3번이 없으면 0번(기본)을 씁니다. (혹은 에러를 내려면 아래 주석 해제)
            # 슬라이싱 문법 : 는 전체를 의미 0은 채널 0번만 가져와라
            return data[:, :, :, 0]

        return data[:, :, :, target_modality]
    # rasie란? 예외를 일부러 발생시켜 중단
    # f-string 문법
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