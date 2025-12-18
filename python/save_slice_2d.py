# -*- coding: utf-8 -*-
"""
✅ save_slice_2d.py

역할:
- NII(.nii / .nii.gz)를 읽어서 2D slice 이미지를 PNG로 저장한다.
- axis(axial/coronal/sagittal)에 따라 자르는 방향이 달라진다.
- stdout으로 JSON을 출력해서, Spring이 그걸 파싱해 응답한다.

설치(가상환경 권장):
pip install nibabel numpy matplotlib pillow

※ matplotlib는 GUI 없이 저장하려고 Agg 백엔드를 사용한다.
"""

import argparse
import json
import os

import numpy as np

# ✅ GUI 없는 서버환경에서도 저장 가능하게 하는 백엔드
import matplotlib
matplotlib.use("Agg")  # 중요!
import matplotlib.pyplot as plt

import nibabel as nib


def normalize_to_uint8(img2d: np.ndarray) -> np.ndarray:
    """
    ✅ 2D 슬라이스를 0~255 uint8로 정규화
    - 의료영상은 값 범위가 들쭉날쭉이라 그냥 min/max 쓰면 대비가 이상해질 수 있음
    - 그래서 percentile 기반으로 클리핑 후 정규화하는 방식(실무에서도 흔함)
    """
    img = img2d.astype(np.float32)

    # NaN/inf 방지
    img = np.nan_to_num(img, nan=0.0, posinf=0.0, neginf=0.0)

    vmin = np.percentile(img, 1)
    vmax = np.percentile(img, 99)

    if vmax <= vmin:
        # 거의 평평한 이미지면 그냥 0으로
        return np.zeros_like(img, dtype=np.uint8)

    img = np.clip(img, vmin, vmax)
    img = (img - vmin) / (vmax - vmin)
    img = (img * 255.0).astype(np.uint8)
    return img


def pick_volume(data: np.ndarray, axis: str) -> np.ndarray:
    """
    ✅ NII 데이터가 3D 또는 4D일 수 있으므로 여기서 통일
    - data.ndim == 3 : 그대로 사용
    - data.ndim == 4 :
        (1) 마지막 차원이 3이면 '채널'이라고 보고 axis별 채널 선택(너 설명을 최대한 반영)
        (2) 아니면 첫번째 볼륨(data[:,:,:,0]) 사용
    """
    if data.ndim == 3:
        return data

    if data.ndim == 4:
        # 너가 말한 "채널에 axial/coronal/sagittal" 같은 구조를 최대한 대응
        if data.shape[3] == 3:
            ch_map = {"axial": 0, "coronal": 1, "sagittal": 2}
            ch = ch_map.get(axis, 0)
            return data[:, :, :, ch]

        # 일반적인 4D(fMRI 등)면 첫 볼륨 사용
        return data[:, :, :, 0]

    raise ValueError(f"Unsupported NIfTI dimension: {data.ndim}")


def extract_slices(volume: np.ndarray, axis: str) -> list[np.ndarray]:
    """
    ✅ axis에 따라 슬라이스 리스트 생성
    - axial    : z축으로 자름 -> volume[:, :, z]
    - coronal  : y축으로 자름 -> volume[:, y, :]
    - sagittal : x축으로 자름 -> volume[x, :, :]
    """
    slices = []

    if axis == "axial":
        for z in range(volume.shape[2]):
            sl = volume[:, :, z]
            sl = np.rot90(sl)  # 보기 좋게 회전(방향은 데이터마다 다를 수 있음)
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
    parser.add_argument("--axis", required=True, choices=["axial", "coronal", "sagittal"])
    parser.add_argument("--outdir", required=True, help="Output directory for png slices")
    args = parser.parse_args()

    os.makedirs(args.outdir, exist_ok=True)

    # ✅ NIfTI 로드
    nii = nib.load(args.input)
    data = nii.get_fdata()  # float64로 로드됨

    # ✅ 3D 볼륨 선택
    volume = pick_volume(data, args.axis)

    # ✅ 슬라이스 뽑기
    slices = extract_slices(volume, args.axis)

    # ✅ 저장
    # 파일명 규칙: slice_000.png, slice_001.png ...
    for i, sl in enumerate(slices):
        img_u8 = normalize_to_uint8(sl)

        out_path = os.path.join(args.outdir, f"slice_{i:03d}.png")

        # ✅ matplotlib로 저장 (cmap="gray")
        # 어떤 문법? plt.imsave : 배열을 이미지로 저장
        plt.imsave(out_path, img_u8, cmap="gray")

    # ✅ 스프링이 파싱할 JSON stdout 출력
    result = {
        "ok": True,
        "axis": args.axis,
        "sliceCount": len(slices),
        "outdir": args.outdir
    }
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()

# 이 파일을 직접 실행했을 때만 main() 실행해라
# 엔트리포인트