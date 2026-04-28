import numpy as np
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense

X = np.load("vitals_sequences.npy")  # shape: (samples, timesteps, features)
y = np.load("labels.npy")            # deterioration within 30 min

model = Sequential([
    LSTM(64, return_sequences=True, input_shape=(30, 3)),
    LSTM(32),
    Dense(1, activation="sigmoid")
])

model.compile(
    optimizer="adam",
    loss="binary_crossentropy",
    metrics=["accuracy"]
)

model.fit(X, y, epochs=20, batch_size=32)
model.save("icu_deterioration_model.h5")
