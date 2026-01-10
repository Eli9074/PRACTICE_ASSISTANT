import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranscribingCenter } from './transcribing-center';

describe('TranscribingCenter', () => {
  let component: TranscribingCenter;
  let fixture: ComponentFixture<TranscribingCenter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranscribingCenter]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TranscribingCenter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
