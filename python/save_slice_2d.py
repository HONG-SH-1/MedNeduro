# -*- coding: utf-8 -*-
"""
✅ save_slice_2d.py

역할:
- NII(.nii / .nii.gz)를 읽어서 2D slice 이미지를 PNG로 저장한다.
- axis(axial/coronal/sagittal)에 따라 자르는 방향이 달라진다.
- 마지막 차원(modality) 중 '3번 채널'만 사용한다 (기존 기능 유지).
- stdout으로 JSON을 출력해서 Spring이 파싱해 응답한다.

설치(가상환경 권장):
pip install nibabel numpy matplotlib pillow
"""

import argparse
import json
import os

import numpy as np

# ✅ GUI 없는 서버환경에서도 이미지 저장 가능
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

import nibabel as nib


def normalize_to_uint8(img2d: np.ndarray) -> np.ndarray:
    """
    ✅ 2D 슬라이스를 0~255 uint8로 정규화
    - percentile 기반 클리핑 (의료영상 실무에서 흔히 사용)
    """
    img = img2d.astype(np.float32)

    # NaN / inf 제거
    img = np.nan_to_num(img, nan=0.0, posinf=0.0, neginf=0.0)

    vmin = np.percentile(img, 1)
    vmax = np.percentile(img, 99)

    if vmax <= vmin:
        return np.zeros_like(img, dtype=np.uint8)

    img = np.clip(img, vmin, vmax)
    img = (img - vmin) / (vmax - vmin)
    img = (img * 255.0).astype(np.uint8)

    return img


def pick_volume(data: np.ndarray) -> np.ndarray:
    """
    ✅ NII 데이터에서 사용할 3D 볼륨 선택
    - 3D NII : 그대로 사용
    - 4D NII : 마지막 차원(modality) 중 '3번 채널' 고정 사용

    ⚠️ 기존 axis / slice 기능은 여기서 절대 건드리지 않음
    """
    if data.ndim == 3:
        return data

    if data.ndim == 4:
        modality = 3  # 🔥 채널 3번 고정

        if modality < 0 or modality >= data.shape[3]:
            raise ValueError(
                f"Invalid modality index {modality}, "
                f"available: 0 ~ {data.shape[3] - 1}"
            )

        return data[:, :, :, modality]

    raise ValueError(f"Unsupported NIfTI dimension: {data.ndim}")


def extract_slices(volume: np.ndarray, axis: str) -> list[np.ndarray]:
    """
    ✅ axis에 따라 슬라이스 리스트 생성
    - axial    : z축 -> volume[:, :, z]
    - coronal  : y축 -> volume[:, y, :]
    - sagittal : x축 -> volume[x, :, :]
    """
    slices = []

    if axis == "axial":
        for z in range(volume.shape[2]):
            sl = volume[:, :, z]
            sl = np.rot90(sl)
            slices.append(sl)

    elif axis == "coronal":
        for y in range(volume.shape[1]):
            sl = volume[:, y, :]
            sl = np.rot90(sl)
            slices.append(sl)

    elif axis == "sagittal":
        for x in range(volume.shape[0]):
            sl = volume[x, :, :]
            sl = np.rot90(sl)
            slices.append(sl)

    else:
        raise ValueError(f"Invalid axis: {axis}")

    return slices


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Path to .nii or .nii.gz")
    parser.add_argument(
        "--axis",
        required=True,
        choices=["axial", "coronal", "sagittal"],
        help="Slice axis"
    )
    parser.add_argument("--outdir", required=True, help="Output directory")

    args = parser.parse_args()

    os.makedirs(args.outdir, exist_ok=True)

    # ✅ NIfTI 로드
    nii = nib.load(args.input)
    data = nii.get_fdata()  # float64

    # ✅ 채널 3번 고정된 3D 볼륨 선택
    volume = pick_volume(data)

    # ✅ axis 기준으로 슬라이스 추출
    slices = extract_slices(volume, args.axis)

    # ✅ PNG 저장
    for i, sl in enumerate(slices):
        img_u8 = normalize_to_uint8(sl)
        out_path = os.path.join(args.outdir, f"slice_{i:03d}.png")
        plt.imsave(out_path, img_u8, cmap="gray")

    # ✅ Spring이 파싱할 JSON 출력
    result = {
        "ok": True,
        "axis": args.axis,
        "sliceCount": len(slices),
        "outdir": args.outdir,
        "modality": 3
    }

    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
