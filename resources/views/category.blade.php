@extends('layouts.app')

@section('content')
    <div class="header bg-gradient-primary pb-8 pt-5 pt-md-8">
        <div class="container-fluid">
            <div class="header-body">
                <a class="h4 mb-0 text-white text-uppercase d-none d-lg-inline-block dash-below" href="{{ route('home') }}">Dashboard&nbsp;></a><a class="h4 mb-0 text-white text-uppercase d-none d-lg-inline-block" href="{{ '/category/'.$category->name }}">&nbsp;{{ $category->name }}</a>
                <div class="row" id="row">
                    <!-- Card stats -->
                    @foreach($goods as $good)
                        <?php
                        $portions=$good->portions()->get();
                        ?>

                        <div class="col-xl-3 col-lg-6">
                            <a class="nav-link pr-0" href="#" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                            <div class="card card-stats mb-4 mb-xl-3 pointer breath">
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col">
                                            <span class="h2 font-weight-bold mb-0">{{ $good->name }}</span>
                                        </div>
                                        <div class="col-auto">
                                            @if($category->name=="Appetizers")
                                                <div class="icon icon-shape bg-orange text-white rounded-circle shadow">
                                                    <i class="fas fa-cookie-bite"></i>
                                                </div>
                                            @elseif($category->name=="Entrees")
                                                <div class="icon icon-shape bg-danger text-white rounded-circle shadow">
                                                    <i class="fas fa-pizza-slice"></i>
                                                </div>
                                            @elseif($category->name=="Drinks")
                                                <div class="icon icon-shape bg-blue text-white rounded-circle shadow">
                                                    <i class="fas fa-wine-glass-alt"></i>
                                                </div>
                                            @elseif($category->name=="Desserts")
                                                <div class="icon icon-shape bg-pink text-white rounded-circle shadow">
                                                    <i class="fas fa-ice-cream"></i>
                                                </div>
                                            @endif
                                        </div>
                                    </div>
                                    <p class="mt-3 mb-0 text-muted text-sm">
                                        <span class="text-success mr-2"><i class="fas fa-box"></i> {{ $good->portions()->count() }}</span>
                                        <span class="text-nowrap">Portion count</span>
                                    </p>
                                </div>
                            </div>
                            </a>
                            <div class="dropdown-menu dropdown-menu-inner">
                                <div class=" dropdown-header noti-title">
                                    <h6 class="text-overflow m-0">Chose Portion</h6>
                                </div>
                                <div class="dropdown-divider"></div>
                                @foreach($portions as $portion)
                                <a href="#" onclick="add({{ $portion->id }})" class="dropdown-item">
                                    <i class="ni ni-button-play"></i>
                                    <span>{{ $portion->portion }} ({{ $portion->price }})</span>
                                </a>
                                @endforeach
                            </div>
                        </div>

                    @endforeach

                    <script type="text/javascript">
                        $.ajaxSetup({
                            headers: {
                                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                            }
                        });
                        function add(id){
                            $.ajax({
                                type:'POST',
                                url:'/add-portion',
                                data:{id:id},
                                success:function(){
                                    location.reload();
                                }
                            });
                        }

                        var timer;
                        function up()
                        {
                            timer = setTimeout(function()
                            {
                                var keywords = $('#search_bar').val();
                                var category= "{{$category->name}}";
                                $.post('/search-goods', {keywords: keywords, category:category}, function(data)
                                {
                                    $('#row').html(data);
                                });
                            }, 500);
                        }
                        function down()
                        {
                            clearTimeout(timer);
                        }
                    </script>

                </div>
            </div>
        </div>
    </div>

    <div class="container-fluid mt--7">
        <div class="row">
            <div class="col-xl-8 mb-5 mb-xl-0">

            </div>
            <div class="col-xl-4">

            </div>
        </div>
        <div class="row mt-5">

        </div>

        @include('layouts.footers.auth')
    </div>
@endsection

@push('js')
    <script src="{{ asset('argon') }}/vendor/chart.js/dist/Chart.min.js"></script>
    <script src="{{ asset('argon') }}/vendor/chart.js/dist/Chart.extension.js"></script>
@endpush