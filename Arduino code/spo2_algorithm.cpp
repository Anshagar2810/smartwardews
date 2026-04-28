#include "spo2_algorithm.h"
#include <math.h>

static const uint8_t uch_spo2_table[184] = {
  95,95,95,96,96,96,97,97,97,97,98,98,98,98,98,99,99,99,99,99,
  99,99,99,99,100,100,100,100,100,100,100,100,100,100,100,100,
  100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,
  100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,
  100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,
  100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,
  100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,
  100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,
  100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,
  100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,
  100,100,100,100
};

static int32_t maxim_find_peak(int32_t *pn_locs, int32_t *pn_npks, int32_t *pn_x, int32_t n_size, int32_t n_min_height, int32_t n_min_distance, int32_t n_max_num)
{
  int32_t i = 1, n_width;
  *pn_npks = 0;

  while (i < n_size - 1) {
    if (pn_x[i] > n_min_height && pn_x[i] > pn_x[i - 1]) {
      n_width = 1;
      while (i + n_width < n_size && pn_x[i] == pn_x[i + n_width]) n_width++;
      if (pn_x[i] > pn_x[i + n_width] && *pn_npks < n_max_num) {
        pn_locs[*pn_npks] = i;
        (*pn_npks)++;
        i += n_width + n_min_distance; // enforce min distance
        continue;
      }
      i += n_width;
    }
    i++;
  }
  return 0;
}

static void maxim_remove_close_peaks(int32_t *pn_locs, int32_t *pn_npks, int32_t *pn_x, int32_t n_min_distance)
{
  int32_t i, j;
  for (i = 0; i < *pn_npks; i++) {
    for (j = i + 1; j < *pn_npks; j++) {
      if (abs(pn_locs[j] - pn_locs[i]) < n_min_distance) {
        if (pn_x[pn_locs[j]] > pn_x[pn_locs[i]]) pn_locs[i] = pn_locs[j];
        for (int32_t k = j; k < *pn_npks - 1; k++) pn_locs[k] = pn_locs[k + 1];
        (*pn_npks)--;
        j--;
      }
    }
  }
}

void maxim_heart_rate_and_oxygen_saturation(
  uint32_t *pun_ir_buffer, int32_t n_ir_buffer_length,
  uint32_t *pun_red_buffer,
  int32_t *pn_spo2, int8_t *pch_spo2_valid,
  int32_t *pn_heart_rate, int8_t *pch_hr_valid
) {
  // Basic / lightweight implementation:
  // - HR via IR peak-to-peak interval
  // - SpO2 via ratio-of-ratios (AC/DC) around detected peaks
  // This is a commonly used embedded approximation.

  const int32_t n_size = n_ir_buffer_length;
  static int32_t an_ir[200];
  static int32_t an_red[200];

  if (n_size > 200) { *pch_hr_valid = 0; *pch_spo2_valid = 0; return; }

  // Convert to signed + remove DC (mean)
  int64_t ir_sum = 0, red_sum = 0;
  for (int i = 0; i < n_size; i++) { ir_sum += pun_ir_buffer[i]; red_sum += pun_red_buffer[i]; }
  int32_t ir_mean = (int32_t)(ir_sum / n_size);
  int32_t red_mean = (int32_t)(red_sum / n_size);

  for (int i = 0; i < n_size; i++) {
    an_ir[i]  = (int32_t)pun_ir_buffer[i]  - ir_mean;
    an_red[i] = (int32_t)pun_red_buffer[i] - red_mean;
  }

  // Smooth a bit (moving average)
  for (int i = 1; i < n_size - 1; i++) {
    an_ir[i]  = (an_ir[i - 1] + an_ir[i] + an_ir[i + 1]) / 3;
    an_red[i] = (an_red[i - 1] + an_red[i] + an_red[i + 1]) / 3;
  }

  // Find peaks on IR
  int32_t peak_locs[15];
  int32_t n_peaks = 0;

  // dynamic threshold
  int32_t ir_max = 0;
  for (int i = 0; i < n_size; i++) ir_max = max(ir_max, an_ir[i]);
  int32_t thr = max(30, ir_max / 4);

  maxim_find_peak(peak_locs, &n_peaks, an_ir, n_size, thr, 4, 15);
  maxim_remove_close_peaks(peak_locs, &n_peaks, an_ir, 6);

  // Heart rate
  if (n_peaks >= 2) {
    int32_t peak_interval_sum = 0;
    for (int i = 1; i < n_peaks; i++) peak_interval_sum += (peak_locs[i] - peak_locs[i - 1]);
    float avg_interval = (float)peak_interval_sum / (n_peaks - 1);

    // sample rate assumed 100Hz in your sensor setup
    float hr = 60.0f * 100.0f / avg_interval;

    if (hr > 30 && hr < 240) {
      *pn_heart_rate = (int32_t)hr;
      *pch_hr_valid = 1;
    } else {
      *pch_hr_valid = 0;
    }
  } else {
    *pch_hr_valid = 0;
  }

  // SpO2 using ratio-of-ratios over each peak window
  if (n_peaks >= 2) {
    float ratio_sum = 0;
    int ratio_count = 0;

    for (int i = 0; i < n_peaks; i++) {
      int p = peak_locs[i];
      int left = max(0, p - 8);
      int right = min(n_size - 1, p + 8);

      int32_t ir_ac = 0, red_ac = 0;
      int32_t ir_dc = 0, red_dc = 0;

      // DC estimate = mean around window (already removed mean globally; use local abs mean as DC proxy)
      int32_t ir_abs_sum = 0, red_abs_sum = 0;
      int32_t ir_peak = an_ir[p], red_peak = an_red[p];

      for (int k = left; k <= right; k++) {
        ir_abs_sum += abs(an_ir[k]);
        red_abs_sum += abs(an_red[k]);
      }
      ir_dc = ir_abs_sum / (right - left + 1);
      red_dc = red_abs_sum / (right - left + 1);

      ir_ac = abs(ir_peak);
      red_ac = abs(red_peak);

      if (ir_dc > 0 && red_dc > 0 && ir_ac > 0) {
        float r = ( (float)red_ac / (float)red_dc ) / ( (float)ir_ac / (float)ir_dc );
        ratio_sum += r;
        ratio_count++;
      }
    }

    if (ratio_count > 0) {
      float ratio = ratio_sum / ratio_count;

      // Convert ratio -> SpO2 via lookup-ish mapping
      // Typical embedded approximation: SpO2 ≈ 110 - 25*ratio
      int32_t spo2_calc = (int32_t)(110.0f - 25.0f * ratio);

      spo2_calc = constrain(spo2_calc, 0, 100);

      // Optional: small table correction
      // map ratio range to table index roughly (0.4..1.6 -> 0..183)
      int idx = (int)((ratio - 0.4f) * (183.0f / 1.2f));
      idx = constrain(idx, 0, 183);
      spo2_calc = uch_spo2_table[idx];

      if (spo2_calc >= 70 && spo2_calc <= 100) {
        *pn_spo2 = spo2_calc;
        *pch_spo2_valid = 1;
      } else {
        *pch_spo2_valid = 0;
      }
    } else {
      *pch_spo2_valid = 0;
    }
  } else {
    *pch_spo2_valid = 0;
  }
}
